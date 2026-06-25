export type RoomStatus = 'waiting' | 'playing' | 'finished'
export type EventType = 'chat' | 'pass' | 'power' | 'explode' | 'join' | 'start' | 'system'
export type PowerType = 'shield' | 'freeze' | 'speed_pass' | 'double_points' | 'reverse' | 'time_bomb'

export interface Room {
  id: string
  code: string
  host_id: string
  status: RoomStatus
  buy_in: number
  bomb_holder_id: string | null
  explosion_at: string | null
  round_number: number
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  room_id: string
  user_id: string
  nickname: string
  avatar: string
  points: number
  is_alive: boolean
  is_frozen: boolean
  frozen_until: string | null
  shield_active: boolean
  double_points_until: string | null
  reverse_active: boolean
  powers: Record<PowerType, number> // quantity owned
  joined_at: string
}

export interface GameEvent {
  id: string
  room_id: string
  type: EventType
  player_id: string | null
  nickname: string | null
  message: string
  created_at: string
}

export const POWER_CATALOG: Record<PowerType, { name: string; description: string; cost: number; emoji: string }> = {
  shield:        { name: 'Shield',        description: 'Bounce the bomb back to sender',       cost: 50,  emoji: '🛡️' },
  freeze:        { name: 'Freeze',        description: 'Freeze target for 10s (cannot pass)',  cost: 80,  emoji: '❄️' },
  speed_pass:    { name: 'Speed Pass',    description: 'Pass instantly with no cooldown',       cost: 40,  emoji: '⚡' },
  double_points: { name: 'Double Points', description: 'Earn 2x points for 15s',               cost: 60,  emoji: '×2' },
  reverse:       { name: 'Reverse',       description: 'Redirect next incoming bomb',           cost: 70,  emoji: '↩️' },
  time_bomb:     { name: 'Time Bomb',     description: 'Subtract 15s from explosion timer',     cost: 90,  emoji: '⏱️' },
}

export const AVATARS = ['🐱', '🐶', '🦊', '🐸', '🐻', '🐼', '🐯', '🐨', '🦁', '🐮']
