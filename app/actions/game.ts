'use server'

import { createClient } from '@/lib/supabase/server'
import { PowerType, POWER_CATALOG } from '@/lib/types'
import { revalidatePath } from 'next/cache'

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signInAnon() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) return { error: error.message }
  return { user: data.user }
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Room management ───────────────────────────────────────────────────────────

export async function createRoom(nickname: string, avatar: string, buyIn: number = 0) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const code = generateCode()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code, host_id: user.id, buy_in: buyIn, status: 'waiting' })
    .select()
    .single()

  if (roomError) return { error: roomError.message }

  const { error: playerError } = await supabase
    .from('players')
    .insert({ room_id: room.id, user_id: user.id, nickname, avatar, powers: {} })

  if (playerError) return { error: playerError.message }

  await supabase.from('events').insert({
    room_id: room.id,
    type: 'join',
    nickname,
    message: `${nickname} created the room`,
  })

  return { room, code }
}

export async function joinRoom(code: string, nickname: string, avatar: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

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
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    const { data: allPlayers } = await supabase
      .from('players')
      .select()
      .eq('room_id', room.id)
    if ((allPlayers?.length ?? 0) >= 8) return { error: 'Room is full (max 8 players)' }

    const { error: playerError } = await supabase
      .from('players')
      .insert({ room_id: room.id, user_id: user.id, nickname, avatar, powers: {} })

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

export async function startGame(roomId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: room } = await supabase.from('rooms').select().eq('id', roomId).single()
  if (!room) return { error: 'Room not found' }
  if (room.host_id !== user.id) return { error: 'Only the host can start the game' }

  const { data: players } = await supabase
    .from('players').select().eq('room_id', roomId)
  if (!players || players.length < 2) return { error: 'Need at least 2 players' }

  // Random starting bomb holder, random explosion timer 20-35s
  const startingHolder = players[Math.floor(Math.random() * players.length)]
  const explosionSeconds = 20 + Math.floor(Math.random() * 16)
  const explosionAt = new Date(Date.now() + explosionSeconds * 1000).toISOString()

  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'playing',
      bomb_holder_id: startingHolder.id,
      explosion_at: explosionAt,
    })
    .eq('id', roomId)

  if (error) return { error: error.message }

  await supabase.from('events').insert({
    room_id: roomId,
    type: 'start',
    message: `Game started! ${startingHolder.nickname} holds the bomb. Timer: ${explosionSeconds}s`,
  })

  revalidatePath(`/room/${room.code}`)
  return { success: true }
}

export async function passBomb(roomId: string, targetPlayerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: room } = await supabase.from('rooms').select().eq('id', roomId).single()
  if (!room || room.status !== 'playing') return { error: 'Game not in progress' }

  const { data: myPlayer } = await supabase
    .from('players').select().eq('room_id', roomId).eq('user_id', user.id).single()
  if (!myPlayer) return { error: 'Player not found' }
  if (room.bomb_holder_id !== myPlayer.id) return { error: 'You do not have the bomb' }
  if (myPlayer.is_frozen) {
    const frozenUntil = myPlayer.frozen_until ? new Date(myPlayer.frozen_until) : null
    if (frozenUntil && frozenUntil > new Date()) return { error: 'You are frozen!' }
    // Unfreeze if time expired
    await supabase.from('players').update({ is_frozen: false, frozen_until: null }).eq('id', myPlayer.id)
  }

  let actualTargetId = targetPlayerId

  // Check target's reverse power
  const { data: target } = await supabase
    .from('players').select().eq('id', targetPlayerId).single()
  if (!target) return { error: 'Target player not found' }

  if (target.reverse_active) {
    // Bomb comes back!
    actualTargetId = myPlayer.id
    await supabase.from('players').update({ reverse_active: false }).eq('id', targetPlayerId)
    await supabase.from('events').insert({
      room_id: roomId, type: 'power', nickname: target.nickname,
      message: `${target.nickname} reversed the bomb back to ${myPlayer.nickname}!`,
    })
  } else if (myPlayer.shield_active) {
    // Shield bounces back
    actualTargetId = myPlayer.id
    await supabase.from('players').update({ shield_active: false }).eq('id', myPlayer.id)
    await supabase.from('events').insert({
      room_id: roomId, type: 'power', nickname: myPlayer.nickname,
      message: `${myPlayer.nickname}'s shield deflected the bomb back!`,
    })
  }

  // Award points to current holder based on time held (simplified: 1 point per pass)
  const pointsEarned = myPlayer.double_points_until && new Date(myPlayer.double_points_until) > new Date() ? 2 : 1

  await supabase.from('players')
    .update({ points: myPlayer.points + pointsEarned })
    .eq('id', myPlayer.id)

  await supabase.from('rooms')
    .update({ bomb_holder_id: actualTargetId })
    .eq('id', roomId)

  const actualTarget = actualTargetId === myPlayer.id ? myPlayer : target
  await supabase.from('events').insert({
    room_id: roomId, type: 'pass', nickname: myPlayer.nickname,
    message: `${myPlayer.nickname} passed the bomb to ${actualTarget.nickname}`,
  })

  return { success: true }
}

export async function buyPower(roomId: string, powerType: PowerType) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const power = POWER_CATALOG[powerType]
  if (!power) return { error: 'Unknown power' }

  const { data: player } = await supabase
    .from('players').select().eq('room_id', roomId).eq('user_id', user.id).single()
  if (!player) return { error: 'Player not found' }
  if (player.points < power.cost) return { error: `Need ${power.cost} points (you have ${player.points})` }

  const newPowers = { ...player.powers, [powerType]: ((player.powers[powerType] ?? 0) + 1) }

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

export async function usePower(roomId: string, powerType: PowerType, targetPlayerId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: player } = await supabase
    .from('players').select().eq('room_id', roomId).eq('user_id', user.id).single()
  if (!player) return { error: 'Player not found' }

  const owned = player.powers[powerType] ?? 0
  if (owned < 1) return { error: 'You do not own this power' }

  const newPowers = { ...player.powers, [powerType]: owned - 1 }
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
      const frozenUntil = new Date(Date.now() + 10000).toISOString()
      await supabase.from('players').update({ is_frozen: true, frozen_until: frozenUntil }).eq('id', targetPlayerId)
      const { data: t } = await supabase.from('players').select('nickname').eq('id', targetPlayerId).single()
      eventMsg = `${player.nickname} froze ${t?.nickname ?? 'a player'} for 10s!`
      break
    }

    case 'speed_pass':
      // speed_pass is consumed during passBomb — just confirm ownership
      eventMsg = `${player.nickname} has Speed Pass ready!`
      break

    case 'double_points':
      updatePlayer.double_points_until = new Date(Date.now() + 15000).toISOString()
      eventMsg = `${player.nickname} activated Double Points for 15s!`
      break

    case 'reverse':
      updatePlayer.reverse_active = true
      eventMsg = `${player.nickname} activated Reverse - next bomb redirects back!`
      break

    case 'time_bomb': {
      const { data: room } = await supabase.from('rooms').select('explosion_at').eq('id', roomId).single()
      if (room?.explosion_at) {
        const newExplosion = new Date(new Date(room.explosion_at).getTime() - 15000).toISOString()
        await supabase.from('rooms').update({ explosion_at: newExplosion }).eq('id', roomId)
      }
      eventMsg = `${player.nickname} used Time Bomb - 15 seconds removed!`
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: room } = await supabase.from('rooms').select().eq('id', roomId).single()
  if (!room || room.status !== 'playing') return { error: 'Game not in progress' }

  const { data: holder } = await supabase
    .from('players').select().eq('id', room.bomb_holder_id).single()
  if (!holder) return { error: 'Bomb holder not found' }

  // Eliminate the holder
  await supabase.from('players').update({ is_alive: false }).eq('id', holder.id)

  // Check how many alive players remain
  const { data: alivePlayers } = await supabase
    .from('players').select().eq('room_id', roomId).eq('is_alive', true)

  if (!alivePlayers || alivePlayers.length <= 1) {
    // Game over
    const winner = alivePlayers?.[0]
    await supabase.from('rooms').update({ status: 'finished', bomb_holder_id: null, explosion_at: null }).eq('id', roomId)
    await supabase.from('events').insert({
      room_id: roomId, type: 'explode', nickname: holder.nickname,
      message: `💥 BOOM! ${holder.nickname} exploded! ${winner ? `${winner.nickname} WINS!` : 'Nobody survived!'}`,
    })
  } else {
    // New round: random holder from alive players, new timer
    const nextHolder = alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
    const explosionSeconds = 20 + Math.floor(Math.random() * 16)
    const explosionAt = new Date(Date.now() + explosionSeconds * 1000).toISOString()

    await supabase.from('rooms').update({
      bomb_holder_id: nextHolder.id,
      explosion_at: explosionAt,
      round_number: room.round_number + 1,
    }).eq('id', roomId)

    await supabase.from('events').insert({
      room_id: roomId, type: 'explode', nickname: holder.nickname,
      message: `💥 BOOM! ${holder.nickname} exploded! Round ${room.round_number + 1} starts - ${nextHolder.nickname} gets the bomb!`,
    })
  }

  return { success: true }
}

export async function sendChatMessage(roomId: string, nickname: string, message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('events').insert({
    room_id: roomId, type: 'chat', nickname, message,
  })

  return { success: true }
}

export async function leaveRoom(roomId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('players').delete().eq('room_id', roomId).eq('user_id', user.id)
  return { success: true }
}
