'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Room, Player, GameEvent } from '@/lib/types'

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<GameEvent[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const explodingRef = useRef(false)

  const supabase = createClient()

  // Fetch initial data
  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); return }
    setUserId(user.id)

    const { data: roomData, error: roomErr } = await supabase
      .from('rooms').select('*').eq('code', code.toUpperCase()).single()
    if (roomErr || !roomData) { setError('Room not found'); setLoading(false); return }
    setRoom(roomData)

    const [{ data: playersData }, { data: eventsData }] = await Promise.all([
      supabase.from('players').select('*').eq('room_id', roomData.id).order('joined_at'),
      supabase.from('events').select('*').eq('room_id', roomData.id).order('created_at').limit(50),
    ])

    setPlayers(playersData ?? [])
    setEvents(eventsData ?? [])

    const me = (playersData ?? []).find(p => p.user_id === user.id) ?? null
    setMyPlayer(me)
    setLoading(false)
  }, [code])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Realtime subscriptions
  useEffect(() => {
    if (!room?.id) return
    const roomId = room.id

    const channel = supabase.channel(`room:${roomId}`)

    // Room changes
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}`,
    }, (payload) => {
      if (payload.eventType === 'UPDATE') {
        setRoom(payload.new as Room)
      }
    })

    // Player changes
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}`,
    }, async () => {
      const { data } = await supabase.from('players').select('*').eq('room_id', roomId).order('joined_at')
      if (data) {
        setPlayers(data)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const me = data.find(p => p.user_id === user.id) ?? null
          setMyPlayer(me)
        }
      }
    })

    // Events / chat
    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'events', filter: `room_id=eq.${roomId}`,
    }, (payload) => {
      setEvents(prev => [...prev.slice(-49), payload.new as GameEvent])
    })

    channel.subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room?.id])

  // Countdown: detect explosion
  useEffect(() => {
    if (!room?.explosion_at || room?.status !== 'playing' || !myPlayer) return

    const check = () => {
      const msLeft = new Date(room.explosion_at!).getTime() - Date.now()
      if (msLeft <= 0 && !explodingRef.current) {
        explodingRef.current = true
        // Only the bomb holder triggers the explode action
        if (room.bomb_holder_id === myPlayer.id) {
          import('@/app/actions/game').then(({ explodeBomb }) => {
            explodeBomb(room.id).finally(() => { explodingRef.current = false })
          })
        } else {
          explodingRef.current = false
        }
      }
    }

    const interval = setInterval(check, 250)
    return () => clearInterval(interval)
  }, [room?.explosion_at, room?.status, room?.bomb_holder_id, myPlayer?.id, room?.id])

  return { room, players, events, myPlayer, userId, loading, error, refetch: fetchAll }
}
