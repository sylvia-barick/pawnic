'use server'
// PAWnic game server actions — no Supabase Auth required
import { createClient } from '@/lib/supabase/client-server'
import { PowerType, POWER_CATALOG } from '@/lib/types'
import { verifyBuyInTransaction, sendPayout } from '@/lib/stellar'

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function getRandomExplosionSeconds(): number {
  const rand = Math.random()
  if (rand < 0.35) {
    // Short round: 12 to 25 seconds
    return 12 + Math.floor(Math.random() * 14)
  } else if (rand < 0.80) {
    // Medium round: 30 to 75 seconds
    return 30 + Math.floor(Math.random() * 46)
  } else {
    // Long round: 90 to 180 seconds (1.5 to 3 minutes)
    return 90 + Math.floor(Math.random() * 91)
  }
}

// ── Room management ───────────────────────────────────────────────────────────

export async function createRoom(
  userId: string,
  nickname: string,
  avatar: string,
  buyInXlm: number,
  stellarAddress: string,
  txHash: string
) {
  const supabase = createClient()
  const code = generateCode()

  // 1. Verify player's payment transaction on Stellar Testnet
  const verified = await verifyBuyInTransaction(txHash, buyInXlm.toFixed(7), stellarAddress)
  if (!verified) {
    return { error: 'Buy-in Stellar transaction verification failed. Please try again.' }
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code, host_id: userId, buy_in: buyInXlm, status: 'waiting' })
    .select()
    .single()

  if (roomError) return { error: roomError.message }

  // Store user's Stellar wallet address and buy-in inside powers JSONB metadata
  const initialPowers = { wallet_address: stellarAddress, buy_in: buyInXlm }

  const { error: playerError } = await supabase
    .from('players')
    .insert({ room_id: room.id, user_id: userId, nickname, avatar, powers: initialPowers, points: 100 })

  if (playerError) return { error: playerError.message }

  await supabase.from('events').insert({
    room_id: room.id,
    type: 'join',
    nickname,
    message: `${nickname} created the room (buy-in: ${buyInXlm} XLM)`,
  })

  return { room, code }
}

export async function joinRoom(
  userId: string,
  code: string,
  nickname: string,
  avatar: string,
  stellarAddress: string,
  txHash: string,
  buyInXlm: number
) {
  const supabase = createClient()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select()
    .eq('code', code.toUpperCase())
    .single()

  if (roomError || !room) return { error: 'Room not found' }
  if (room.status !== 'waiting') return { error: 'Game already in progress' }

  const { data: existing } = await supabase
    .from('players')
    .select()
    .eq('room_id', room.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    // 1. Verify player's payment transaction on Stellar
    const verified = await verifyBuyInTransaction(txHash, buyInXlm.toFixed(7), stellarAddress)
    if (!verified) {
      return { error: `Buy-in Stellar transaction verification failed. Must pay ${buyInXlm} XLM.` }
    }

    const { data: allPlayers } = await supabase
      .from('players')
      .select()
      .eq('room_id', room.id)
    if ((allPlayers?.length ?? 0) >= 8) return { error: 'Room is full (max 8 players)' }

    const initialPowers = { wallet_address: stellarAddress, buy_in: buyInXlm }

    const { error: playerError } = await supabase
      .from('players')
      .insert({ room_id: room.id, user_id: userId, nickname, avatar, powers: initialPowers, points: 100 })

    if (playerError) return { error: playerError.message }

    await supabase.from('events').insert({
      room_id: room.id,
      type: 'join',
      nickname,
      message: `${nickname} joined the room (buy-in: ${buyInXlm} XLM)`,
    })
  }

  return { room, code: room.code }
}

export async function startGame(userId: string, roomId: string) {
  const supabase = createClient()

  const { data: room } = await supabase.from('rooms').select().eq('id', roomId).single()
  if (!room) return { error: 'Room not found' }
  if (room.host_id !== userId) return { error: 'Only the host can start the game' }

  const { data: players } = await supabase.from('players').select().eq('room_id', roomId)
  if (!players || players.length < 2) return { error: 'Need at least 2 players to start' }

  const startingHolder = players[Math.floor(Math.random() * players.length)]
  const explosionSeconds = getRandomExplosionSeconds()
  const explosionAt = new Date(Date.now() + explosionSeconds * 1000).toISOString()

  const { error } = await supabase
    .from('rooms')
    .update({ status: 'playing', bomb_holder_id: startingHolder.id, explosion_at: explosionAt })
    .eq('id', roomId)

  if (error) return { error: error.message }

  await supabase.from('events').insert({
    room_id: roomId,
    type: 'start',
    message: `Game started! ${startingHolder.nickname} holds the POTATO. The fuse is ticking...`,
  })

  return { success: true }
}

export async function passBomb(userId: string, roomId: string, targetPlayerId: string) {
  const supabase = createClient()

  const { data: room } = await supabase.from('rooms').select().eq('id', roomId).single()
  if (!room || room.status !== 'playing') return { error: 'Game not in progress' }

  const { data: myPlayer } = await supabase
    .from('players').select().eq('room_id', roomId).eq('user_id', userId).single()
  if (!myPlayer) return { error: 'Player not found' }
  if (room.bomb_holder_id !== myPlayer.id) return { error: 'You do not have the POTATO' }

  // Check freeze
  if (myPlayer.is_frozen) {
    const frozenUntil = myPlayer.frozen_until ? new Date(myPlayer.frozen_until) : null
    if (frozenUntil && frozenUntil > new Date()) return { error: 'You are frozen and cannot pass!' }
    await supabase.from('players').update({ is_frozen: false, frozen_until: null }).eq('id', myPlayer.id)
  }

  const { data: target } = await supabase.from('players').select().eq('id', targetPlayerId).single()
  if (!target) return { error: 'Target player not found' }
  if (!target.is_alive) return { error: 'That player is already out!' }

  let actualTargetId = targetPlayerId
  let reflected = false

  // Reverse power: bomb bounces back
  if (target.reverse_active) {
    reflected = true
    // 1. Temporarily set holder to target so client animation runs
    await supabase.from('rooms').update({ bomb_holder_id: targetPlayerId }).eq('id', roomId)
    // 2. Short pause for animation, then bounce back
    await new Promise(resolve => setTimeout(resolve, 250))
    actualTargetId = myPlayer.id
    await Promise.all([
      supabase.from('players').update({ reverse_active: false }).eq('id', targetPlayerId),
      supabase.from('events').insert({
        room_id: roomId, type: 'power', nickname: target.nickname,
        message: `${target.nickname} reversed the POTATO back to ${myPlayer.nickname}!`,
      }),
    ])
  } else if (target.shield_active) {
    reflected = true
    // 1. Temporarily set holder to target so client animation runs
    await supabase.from('rooms').update({ bomb_holder_id: targetPlayerId }).eq('id', roomId)
    // 2. Short pause for animation, then bounce back
    await new Promise(resolve => setTimeout(resolve, 250))
    actualTargetId = myPlayer.id
    await Promise.all([
      supabase.from('players').update({ shield_active: false }).eq('id', targetPlayerId),
      supabase.from('events').insert({
        room_id: roomId, type: 'power', nickname: target.nickname,
        message: `${target.nickname}'s shield deflected the POTATO back!`,
      }),
    ])
  }

  // Award points (double if active) + move bomb + log event all in parallel
  const isDouble = myPlayer.double_points_until && new Date(myPlayer.double_points_until) > new Date()
  const pointsEarned = isDouble ? 2 : 1

  await Promise.all([
    supabase.from('players').update({ points: myPlayer.points + pointsEarned }).eq('id', myPlayer.id),
    supabase.from('rooms').update({ bomb_holder_id: actualTargetId }).eq('id', roomId),
    supabase.from('events').insert({
      room_id: roomId, type: 'pass', nickname: myPlayer.nickname,
      message: reflected
        ? `${myPlayer.nickname} tried to pass the POTATO to ${target.nickname}, but it was bounced back!`
        : `${myPlayer.nickname} passed the POTATO to ${target.nickname}${isDouble ? ' (+2pts!)' : ''}`,
    }),
  ])

  return { success: true }
}

export async function buyPower(userId: string, roomId: string, powerType: PowerType) {
  const supabase = createClient()
  const power = POWER_CATALOG[powerType]
  if (!power) return { error: 'Unknown power' }

  const { data: player } = await supabase
    .from('players').select().eq('room_id', roomId).eq('user_id', userId).single()
  if (!player) return { error: 'Player not found' }
  if (player.points < power.cost) return { error: `Need ${power.cost} points (you have ${player.points})` }

  const currentPowers = (player.powers ?? {}) as Record<string, number>
  const newPowers = { ...currentPowers, [powerType]: (currentPowers[powerType] ?? 0) + 1 }

  const { error } = await supabase.from('players').update({
    points: player.points - power.cost,
    powers: newPowers,
  }).eq('id', player.id)

  if (error) return { error: error.message }

  await supabase.from('events').insert({
    room_id: roomId, type: 'power', nickname: player.nickname,
    message: `${player.nickname} bought ${power.name}`,
  })

  return { success: true }
}

export async function buyAndUsePower(userId: string, roomId: string, powerType: PowerType, targetPlayerId?: string) {
  const supabase = createClient()
  const power = POWER_CATALOG[powerType]
  if (!power) return { error: 'Unknown power' }

  // 1. Fetch player
  const { data: player } = await supabase
    .from('players').select().eq('room_id', roomId).eq('user_id', userId).single()
  if (!player) return { error: 'Player not found' }

  // 2. Check if player has enough points
  if (player.points < power.cost) return { error: `Need ${power.cost} points (you have ${player.points})` }

  // 3. Check if player is frozen
  const isFrozen = player.is_frozen && player.frozen_until && new Date(player.frozen_until) > new Date()
  if (isFrozen) return { error: 'You are frozen and cannot use powers!' }

  // 4. Nine Lives is a passive auto-triggered ability, just deduct points and add to inventory
  if (powerType === 'nine_lives') {
    const currentPowers = (player.powers ?? {}) as Record<string, number>
    const newPowers = { ...currentPowers, ['nine_lives']: (currentPowers['nine_lives'] ?? 0) + 1 }
    const { error } = await supabase.from('players').update({
      points: player.points - power.cost,
      powers: newPowers,
    }).eq('id', player.id)
    if (error) return { error: error.message }
    await supabase.from('events').insert({
      room_id: roomId, type: 'power', nickname: player.nickname,
      message: `${player.nickname} bought ${power.name}`,
    })
    return { success: true }
  }

  // 5. For other active abilities: deduct points and activate immediately
  let updatePlayer: Record<string, unknown> = { points: player.points - power.cost }
  let eventMsg = `${player.nickname} bought and used ${power.name}`

  switch (powerType) {
    case 'shield':
      updatePlayer.shield_active = true
      eventMsg = `${player.nickname} activated Shield - next bomb bounces back!`
      break

    case 'freeze': {
      if (!targetPlayerId) return { error: 'Freeze requires a target' }
      if (targetPlayerId === player.id) return { error: 'You cannot freeze yourself!' }
      // Fetch target to validate before freezing
      const { data: freezeTarget } = await supabase.from('players').select('nickname, is_alive, is_frozen, frozen_until').eq('id', targetPlayerId).single()
      if (!freezeTarget) return { error: 'Target player not found' }
      if (!freezeTarget.is_alive) return { error: `${freezeTarget.nickname} is already eliminated!` }
      if (freezeTarget.is_frozen && freezeTarget.frozen_until && new Date(freezeTarget.frozen_until) > new Date())
        return { error: `${freezeTarget.nickname} is already frozen!` }
      const frozenUntil = new Date(Date.now() + 10000).toISOString()
      // Freeze target + deduct buyer points in parallel
      await Promise.all([
        supabase.from('players').update({ is_frozen: true, frozen_until: frozenUntil }).eq('id', targetPlayerId),
        supabase.from('players').update({ points: player.points - power.cost }).eq('id', player.id),
      ])
      eventMsg = `${player.nickname} froze ${freezeTarget.nickname} for 10s!`
      // Points already updated, skip second update below
      await supabase.from('events').insert({
        room_id: roomId, type: 'power', nickname: player.nickname, message: eventMsg,
      })
      return { success: true }
    }

    case 'double_points':
      updatePlayer.double_points_until = new Date(Date.now() + 10000).toISOString()
      eventMsg = `${player.nickname} activated Catnip - 2x score for 10s!`
      break

    case 'reverse':
      updatePlayer.reverse_active = true
      eventMsg = `${player.nickname} activated Mirror - next transfer will bounce back!`
      break

    case 'smoke_screen': {
      const smokeUntil = new Date(Date.now() + 10000).toISOString()
      const currentPowers = (player.powers ?? {}) as Record<string, any>
      const powersWithStatus = { ...currentPowers, smoke_screen_until: smokeUntil }
      updatePlayer.powers = powersWithStatus
      eventMsg = `${player.nickname} activated Smoke Screen - holding identity is hidden for 10s!`
      break
    }
  }

  // Player update + event insert in parallel
  await Promise.all([
    supabase.from('players').update(updatePlayer).eq('id', player.id),
    supabase.from('events').insert({
      room_id: roomId, type: 'power', nickname: player.nickname, message: eventMsg,
    }),
  ])

  return { success: true }
}

export async function usePower(userId: string, roomId: string, powerType: PowerType, targetPlayerId?: string) {
  const supabase = createClient()

  const { data: player } = await supabase
    .from('players').select().eq('room_id', roomId).eq('user_id', userId).single()
  if (!player) return { error: 'Player not found' }

  // Check if player is frozen
  const isFrozen = player.is_frozen && player.frozen_until && new Date(player.frozen_until) > new Date()
  if (isFrozen) return { error: 'You are frozen and cannot use powers!' }

  const currentPowers = (player.powers ?? {}) as Record<string, any>
  const owned = currentPowers[powerType] ?? 0
  if (owned < 1) return { error: 'You do not own this power' }

  // Nine Lives is a passive auto-triggered ability
  if (powerType === 'nine_lives') {
    return { error: 'Nine Lives is a passive ability and will automatically save you when you explode!' }
  }

  const newPowers = { ...currentPowers, [powerType]: owned - 1 }
  const powerInfo = POWER_CATALOG[powerType]
  let updatePlayer: Record<string, unknown> = { powers: newPowers }
  let eventMsg = `${player.nickname} used ${powerInfo.name}`

  switch (powerType) {
    case 'shield':
      updatePlayer.shield_active = true
      eventMsg = `${player.nickname} activated Shield - next bomb bounces back!`
      break

    case 'freeze': {
      if (!targetPlayerId) return { error: 'Freeze requires a target' }
      if (targetPlayerId === player.id) return { error: 'You cannot freeze yourself!' }
      const { data: freezeTarget2 } = await supabase.from('players').select('nickname, is_alive, is_frozen, frozen_until').eq('id', targetPlayerId).single()
      if (!freezeTarget2) return { error: 'Target player not found' }
      if (!freezeTarget2.is_alive) return { error: `${freezeTarget2.nickname} is already eliminated!` }
      if (freezeTarget2.is_frozen && freezeTarget2.frozen_until && new Date(freezeTarget2.frozen_until) > new Date())
        return { error: `${freezeTarget2.nickname} is already frozen!` }
      const frozenUntil = new Date(Date.now() + 10000).toISOString()
      // Freeze target + update caster powers in parallel — nickname already fetched
      await Promise.all([
        supabase.from('players').update({ is_frozen: true, frozen_until: frozenUntil }).eq('id', targetPlayerId),
        supabase.from('players').update({ powers: newPowers }).eq('id', player.id),
      ])
      eventMsg = `${player.nickname} froze ${freezeTarget2.nickname} for 10s!`
      await supabase.from('events').insert({ room_id: roomId, type: 'power', nickname: player.nickname, message: eventMsg })
      return { success: true }
    }

    case 'double_points':
      updatePlayer.double_points_until = new Date(Date.now() + 10000).toISOString() // 10 seconds!
      eventMsg = `${player.nickname} activated Catnip - 2x score for 10s!`
      break

    case 'reverse':
      updatePlayer.reverse_active = true
      eventMsg = `${player.nickname} activated Mirror - next transfer will bounce back!`
      break

    case 'smoke_screen': {
      const smokeUntil = new Date(Date.now() + 10000).toISOString() // 10 seconds!
      const powersWithStatus = { ...newPowers, smoke_screen_until: smokeUntil }
      updatePlayer.powers = powersWithStatus
      eventMsg = `${player.nickname} activated Smoke Screen - holding identity is hidden for 10s!`
      break
    }
  }

  await supabase.from('players').update(updatePlayer).eq('id', player.id)
  await supabase.from('events').insert({
    room_id: roomId, type: 'power', nickname: player.nickname, message: eventMsg,
  })

  return { success: true }
}

export async function explodeBomb(roomId: string) {
  const supabase = createClient()

  const { data: room } = await supabase.from('rooms').select().eq('id', roomId).single()
  if (!room || room.status !== 'playing') return { error: 'Game not in progress' }

  const now = new Date()
  if (room.explosion_at && new Date(room.explosion_at) > now) return { error: 'Timer has not expired' }

  // Lock: Atomically set status = finished to prevent duplicate triggers from other clients
  const { data: lockedRoom, error: lockErr } = await supabase
    .from('rooms')
    .update({ status: 'finished', bomb_holder_id: null, explosion_at: null })
    .eq('id', roomId)
    .eq('status', 'playing')
    .eq('explosion_at', room.explosion_at)
    .select()
    .maybeSingle()

  if (lockErr || !lockedRoom) {
    return { success: false, error: 'Explosion already handled' }
  }

  const { data: holder } = await supabase
    .from('players').select().eq('id', room.bomb_holder_id).single()
  if (!holder) return { error: 'Bomb holder not found' }

  // Check if player has Nine Lives active in their inventory
  const currentPowers = (holder.powers ?? {}) as Record<string, any>
  const nineLivesCount = currentPowers['nine_lives'] ?? 0

  if (nineLivesCount > 0) {
    // Consume 1 Nine Lives
    const newPowers = { ...currentPowers, ['nine_lives']: nineLivesCount - 1 }
    await supabase.from('players').update({ powers: newPowers }).eq('id', holder.id)

    // Revert room status back to playing and generate a new timer
    const { data: aliveOtherPlayers } = await supabase
      .from('players')
      .select()
      .eq('room_id', roomId)
      .eq('is_alive', true)
      .neq('id', holder.id)

    let nextHolder = holder
    if (aliveOtherPlayers && aliveOtherPlayers.length > 0) {
      nextHolder = aliveOtherPlayers[Math.floor(Math.random() * aliveOtherPlayers.length)]
    }

    const explosionSeconds = getRandomExplosionSeconds()
    const explosionAt = new Date(Date.now() + explosionSeconds * 1000).toISOString()

    await supabase.from('rooms').update({
      status: 'playing',
      bomb_holder_id: nextHolder.id,
      explosion_at: explosionAt,
      round_number: room.round_number + 1,
    }).eq('id', roomId)

    await supabase.from('events').insert({
      room_id: roomId,
      type: 'explode',
      nickname: holder.nickname,
      message: `BOOM! The POTATO exploded on ${holder.nickname}, but their Nine Lives saved them! The POTATO is passed to ${nextHolder.nickname}!`,
    })

    return { success: true }
  }

  // Otherwise, eliminate them:
  const holderBuyIn = Number(holder.powers?.buy_in ?? 1.0)
  const holderHoldTime = Number(holder.powers?.hold_time ?? 0)
  const holderScore = holderBuyIn * holderHoldTime

  const currentHolderPowers = (holder.powers ?? {}) as Record<string, any>
  const newHolderPowers = {
    ...currentHolderPowers,
    original_contribution: holderBuyIn,
    hold_time: holderHoldTime,
    weighted_score: holderScore,
    bonus_earned: 0,
    payout_amount: 0,
    payout_tx: null
  }
  await supabase.from('players').update({ is_alive: false, powers: newHolderPowers }).eq('id', holder.id)

  // Game ends immediately on the first person to explode!
  // We calculate payouts for other players.
  const { data: allPlayers } = await supabase
    .from('players').select('*').eq('room_id', roomId)

  // Find survivors (everyone except the eliminated holder)
  const survivors = (allPlayers ?? []).filter(p => p.id !== holder.id)

  const L = holderBuyIn // Forfeited Capital
  const totalScore = survivors.reduce((sum, p) => {
    const pBuyIn = Number(p.powers?.buy_in ?? 1.0)
    const pHoldTime = Number(p.powers?.hold_time ?? 0)
    return sum + (pBuyIn * pHoldTime)
  }, 0)

  // Calculate proportional payouts
  let sumOfPayouts = 0
  const survivorPayouts = survivors.map(s => {
    const Ci = Number(s.powers?.buy_in ?? 1.0)
    const holdTime = Number(s.powers?.hold_time ?? 0)
    const score = Ci * holdTime

    let share = 0
    if (totalScore > 0) {
      share = score / totalScore
    } else {
      // Fallback: divide forfeited capital proportional to their original bets
      const totalBets = survivors.reduce((sum, p) => sum + Number(p.powers?.buy_in ?? 1.0), 0)
      share = totalBets > 0 ? Ci / totalBets : (1 / survivors.length)
    }

    const bonus = share * L
    const reward = Ci + bonus

    // Round to 7 decimal places for Stellar's precision
    const rewardRounded = Math.round(reward * 10000000) / 10000000
    sumOfPayouts += rewardRounded

    return {
      player: s,
      originalContribution: Ci,
      holdTime,
      weightedScore: score,
      bonusEarned: reward - Ci,
      reward: rewardRounded,
    }
  })

  // Adjust the last survivor's reward to account for rounding errors
  const totalPrizePool = L + survivors.reduce((sum, p) => sum + Number(p.powers?.buy_in ?? 1.0), 0)
  const difference = Math.round((totalPrizePool - sumOfPayouts) * 10000000) / 10000000
  if (difference !== 0 && survivorPayouts.length > 0) {
    const lastIdx = survivorPayouts.length - 1
    const finalReward = Math.round((survivorPayouts[lastIdx].reward + difference) * 10000000) / 10000000
    survivorPayouts[lastIdx].reward = finalReward
    survivorPayouts[lastIdx].bonusEarned = Math.round((finalReward - survivorPayouts[lastIdx].originalContribution) * 10000000) / 10000000
  }

  // Trigger payments sequentially to prevent Stellar sequence number collisions
  for (const item of survivorPayouts) {
    const s = item.player
    const walletAddress = s.powers?.wallet_address
    if (!walletAddress) {
      console.warn(`No wallet address found for survivor ${s.nickname}`)
      continue
    }

    const payoutStr = item.reward.toFixed(7)

    // Execute payout transfer on Stellar Testnet
    const txHash = await sendPayout(walletAddress, payoutStr)

    // Store payout amount and tx hash in the player's powers metadata
    const currentPowers = (s.powers ?? {}) as Record<string, any>
    const newPowers = {
      ...currentPowers,
      original_contribution: item.originalContribution,
      hold_time: item.holdTime,
      weighted_score: item.weightedScore,
      bonus_earned: Math.round(item.bonusEarned * 10000000) / 10000000,
      payout_amount: item.reward,
      payout_tx: txHash,
    }
    await supabase.from('players').update({ powers: newPowers }).eq('id', s.id)

    await supabase.from('events').insert({
      room_id: roomId,
      type: 'system',
      nickname: s.nickname,
      message: `💸 Paid ${item.reward.toFixed(2)} XLM survival payout to ${s.nickname}! (Tx: ${txHash ? txHash.slice(0, 8) + '...' : 'Failed'})`,
    })
  }

  await supabase.from('events').insert({
    room_id: roomId,
    type: 'explode',
    nickname: holder.nickname,
    message: `💥 BOOM! The POTATO exploded! ${holder.nickname} is eliminated! The game has ended and rewards have been distributed to the survivors.`,
  })

  return { success: true }
}

export async function sendChatMessage(userId: string, roomId: string, nickname: string, message: string) {
  const supabase = createClient()
  const { data: player } = await supabase
    .from('players').select('id').eq('room_id', roomId).eq('user_id', userId).maybeSingle()

  await supabase.from('events').insert({
    room_id: roomId,
    type: 'chat',
    player_id: player?.id ?? null,
    nickname,
    message,
  })
  return { success: true }
}

export async function getRoomBuyIn(code: string) {
  const supabase = createClient()
  const { data: room } = await supabase.from('rooms').select('buy_in').eq('code', code.toUpperCase()).maybeSingle()
  return room ? Number(room.buy_in) : null
}

export async function leaveRoom(userId: string, roomId: string) {
  const supabase = createClient()
  await supabase.from('players').delete().eq('room_id', roomId).eq('user_id', userId)
  return { success: true }
}

export async function incrementHolderPoints(roomId: string, playerId: string) {
  const supabase = createClient()

  // Verify the room is playing and the player is the actual bomb holder
  const { data: room } = await supabase.from('rooms').select('status, bomb_holder_id, updated_at').eq('id', roomId).single()
  if (!room || room.status !== 'playing' || room.bomb_holder_id !== playerId) return { error: 'Not the holder' }

  // Throttle check: ensure at least 950ms has elapsed since the last update
  const lastUpdate = new Date(room.updated_at).getTime()
  if (Date.now() - lastUpdate < 950) {
    return { success: false, error: 'Too soon' }
  }

  // Get the player's current points, double points status, and powers metadata
  const { data: player } = await supabase.from('players').select('points, double_points_until, powers').eq('id', playerId).single()
  if (!player) return { error: 'Player not found' }

  const isDouble = player.double_points_until && new Date(player.double_points_until) > new Date()
  const pointsEarned = isDouble ? 2 : 1

  const currentPowers = (player.powers ?? {}) as Record<string, any>
  const currentHoldTime = Number(currentPowers.hold_time ?? 0)
  const newPowers = {
    ...currentPowers,
    hold_time: currentHoldTime + 1,
  }

  // Perform concurrent updates: increment player points, update hold_time in powers, and refresh room timestamp
  await Promise.all([
    supabase.from('players').update({ points: player.points + pointsEarned, powers: newPowers }).eq('id', playerId),
    supabase.from('rooms').update({ updated_at: new Date().toISOString() }).eq('id', roomId)
  ])

  return { success: true }
}
