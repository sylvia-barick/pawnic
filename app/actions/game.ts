'use server'
// PAWnic game server actions — no Supabase Auth required
import { createClient } from '@/lib/supabase/client-server'
import { PowerType, POWER_CATALOG } from '@/lib/types'

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

export async function createRoom(userId: string, nickname: string, avatar: string) {
  const supabase = createClient()
  const code = generateCode()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code, host_id: userId, buy_in: 0, status: 'waiting' })
    .select()
    .single()

  if (roomError) return { error: roomError.message }

  const { error: playerError } = await supabase
    .from('players')
    .insert({ room_id: room.id, user_id: userId, nickname, avatar, powers: {}, points: 100 })

  if (playerError) return { error: playerError.message }

  await supabase.from('events').insert({
    room_id: room.id,
    type: 'join',
    nickname,
    message: `${nickname} created the room`,
  })

  return { room, code }
}

export async function joinRoom(userId: string, code: string, nickname: string, avatar: string) {
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
    const { data: allPlayers } = await supabase
      .from('players')
      .select()
      .eq('room_id', room.id)
    if ((allPlayers?.length ?? 0) >= 8) return { error: 'Room is full (max 8 players)' }

    const { error: playerError } = await supabase
      .from('players')
      .insert({ room_id: room.id, user_id: userId, nickname, avatar, powers: {}, points: 100 })

    if (playerError) return { error: playerError.message }

    await supabase.from('events').insert({
      room_id: room.id,
      type: 'join',
      nickname,
      message: `${nickname} joined the room`,
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

  // Reverse power: bomb bounces back
  if (target.reverse_active) {
    actualTargetId = myPlayer.id
    await supabase.from('players').update({ reverse_active: false }).eq('id', targetPlayerId)
    await supabase.from('events').insert({
      room_id: roomId, type: 'power', nickname: target.nickname,
      message: `${target.nickname} reversed the POTATO back to ${myPlayer.nickname}!`,
    })
  } else if (myPlayer.shield_active) {
    // Shield bounces back
    actualTargetId = myPlayer.id
    await supabase.from('players').update({ shield_active: false }).eq('id', myPlayer.id)
    await supabase.from('events').insert({
      room_id: roomId, type: 'power', nickname: myPlayer.nickname,
      message: `${myPlayer.nickname}'s shield deflected the POTATO back!`,
    })
  }

  // Award points (double if active)
  const isDouble = myPlayer.double_points_until && new Date(myPlayer.double_points_until) > new Date()
  const pointsEarned = isDouble ? 2 : 1
  await supabase.from('players').update({ points: myPlayer.points + pointsEarned }).eq('id', myPlayer.id)

  await supabase.from('rooms').update({ bomb_holder_id: actualTargetId }).eq('id', roomId)

  const finalTarget = actualTargetId === myPlayer.id ? myPlayer : target
  await supabase.from('events').insert({
    room_id: roomId, type: 'pass', nickname: myPlayer.nickname,
    message: `${myPlayer.nickname} passed the POTATO to ${finalTarget.nickname}${isDouble ? ' (+2pts!)' : ''}`,
  })

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
      const frozenUntil = new Date(Date.now() + 3000).toISOString() // 3 seconds!
      await supabase.from('players').update({ is_frozen: true, frozen_until: frozenUntil }).eq('id', targetPlayerId)
      const { data: t } = await supabase.from('players').select('nickname').eq('id', targetPlayerId).single()
      eventMsg = `${player.nickname} froze ${t?.nickname ?? 'a player'} for 3s!`
      break
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
      const smokeUntil = new Date(Date.now() + 4000).toISOString() // 4 seconds!
      const powersWithStatus = { ...newPowers, smoke_screen_until: smokeUntil }
      updatePlayer.powers = powersWithStatus
      eventMsg = `${player.nickname} activated Smoke Screen - holding identity is hidden for 4s!`
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

  // Lock: Atomically set explosion_at = null to prevent duplicate triggers from other clients
  const { data: lockedRoom, error: lockErr } = await supabase
    .from('rooms')
    .update({ explosion_at: null })
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

    // Pass the bomb to a random other player who is still alive
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
  await supabase.from('players').update({ is_alive: false }).eq('id', holder.id)

  const { data: alivePlayers } = await supabase
    .from('players').select().eq('room_id', roomId).eq('is_alive', true)

  if (!alivePlayers || alivePlayers.length <= 1) {
    const winner = alivePlayers?.[0]
    await supabase.from('rooms')
      .update({ status: 'finished', bomb_holder_id: null, explosion_at: null })
      .eq('id', roomId)

    await supabase.from('events').insert({
      room_id: roomId, type: 'explode', nickname: holder.nickname,
      message: `BOOM! ${holder.nickname} exploded! ${winner ? `${winner.nickname} WINS THE GAME!` : 'No survivors!'}`,
    })
  } else {
    const nextHolder = alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
    const explosionSeconds = getRandomExplosionSeconds()
    const explosionAt = new Date(Date.now() + explosionSeconds * 1000).toISOString()

    await supabase.from('rooms').update({
      bomb_holder_id: nextHolder.id,
      explosion_at: explosionAt,
      round_number: room.round_number + 1,
    }).eq('id', roomId)

    await supabase.from('events').insert({
      room_id: roomId, type: 'explode', nickname: holder.nickname,
      message: `BOOM! ${holder.nickname} is eliminated! Round ${room.round_number + 1} - ${nextHolder.nickname} gets the POTATO!`,
    })
  }

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

  // Get the player's current points and double points status
  const { data: player } = await supabase.from('players').select('points, double_points_until').eq('id', playerId).single()
  if (!player) return { error: 'Player not found' }

  const isDouble = player.double_points_until && new Date(player.double_points_until) > new Date()
  const pointsEarned = isDouble ? 2 : 1

  // Perform concurrent updates: increment player points and refresh room's updated_at timestamp to lock the throttle
  await Promise.all([
    supabase.from('players').update({ points: player.points + pointsEarned }).eq('id', playerId),
    supabase.from('rooms').update({ updated_at: new Date().toISOString() }).eq('id', roomId)
  ])

  return { success: true }
}
