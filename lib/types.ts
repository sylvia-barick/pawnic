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
  reverse:       { name: 'Mirror',        description: 'Reflect next transfer',                cost: 100, emoji: '🔮' },
  freeze:        { name: 'Freeze',        description: 'Freeze target for 3s',                 cost: 80,  emoji: '❄️' },
  double_points: { name: 'Catnip',        description: '2x score for 10s',                     cost: 60,  emoji: '🌿' },
  speed_pass:    { name: 'Smoke Screen',  description: 'Hide holder for 4s',                   cost: 70,  emoji: '☁️' },
  time_bomb:     { name: 'Nine Lives',    description: 'Survive one explosion',                cost: 150, emoji: '🐱' },
  shield:        { name: 'Shield',        description: 'Bounce the bomb back to sender',       cost: 50,  emoji: '🛡️' },
}

export const AVATARS = ['🐱', '🐶', '🦊', '🐸', '🐻', '🐼', '🐯', '🐨', '🦁', '🐮']
