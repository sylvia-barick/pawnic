export type RoomStatus = 'waiting' | 'playing' | 'finished'
export type EventType = 'chat' | 'pass' | 'power' | 'explode' | 'join' | 'start' | 'system'
export type PowerType = 'reverse' | 'freeze' | 'double_points' | 'smoke_screen' | 'nine_lives' | 'shield'

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
  powers: Record<string, any> // quantity owned + active state metadata
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
  reverse:       { name: 'Mirror',        description: 'Reflects the next incoming POTATO back to the sender.', cost: 100, emoji: '🔮' },
  freeze:        { name: 'Freeze',        description: 'Freezes a target player for 3 seconds so they can\'t pass or use powers.', cost: 80,  emoji: '❄️' },
  double_points: { name: 'Catnip',        description: 'Doubles your point gain for 10 seconds while holding the POTATO.', cost: 60,  emoji: '🌿' },
  smoke_screen:  { name: 'Smoke Screen',  description: 'Hides who is holding the POTATO from other players for 4 seconds.', cost: 70,  emoji: '☁️' },
  nine_lives:    { name: 'Nine Lives',    description: 'Automatically saves you from one explosion once per match.', cost: 150, emoji: '🐱' },
  shield:        { name: 'Shield',        description: 'Bounce the bomb back to sender',       cost: 50,  emoji: '🛡️' },
}

export const AVATARS = ['🐱', '🐶', '🦊', '🐸', '🐻', '🐼', '🐯', '🐨', '🦁', '🐮']
