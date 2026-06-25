'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Room, Player, GameEvent } from '@/lib/types'
import { explodeBomb } from '@/app/actions/game'

function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('pawnic_user_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('pawnic_user_id', id)
  }
  return id
}

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<GameEvent[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const explodingRef = useRef(false)
  const roomIdRef = useRef<string | null>(null)

  const supabase = createClient()

  const fetchAll = useCallback(async (uid: string) => {
    const { data: roomData, error: roomErr } = await supabase
      .from('rooms').select('*').eq('code', code.toUpperCase()).single()

    if (roomErr || !roomData) {
      setError('Room not found')
      setLoading(false)
      return null
    }

    setRoom(roomData)
    roomIdRef.current = roomData.id

    const [{ data: playersData }, { data: eventsData }] = await Promise.all([
      supabase.from('players').select('*').eq('room_id', roomData.id).order('joined_at'),
      supabase.from('events').select('*').eq('room_id', roomData.id).order('created_at').limit(60),
    ])

    const pList = playersData ?? []
    setPlayers(pList)
    setEvents(eventsData ?? [])
    const me = pList.find(p => p.user_id === uid) ?? null
    setMyPlayer(me)
    setLoading(false)
    return roomData
  }, [code])

  // Initial load
  useEffect(() => {
    const uid = getOrCreateUserId()
    setUserId(uid)
    fetchAll(uid)
  }, [fetchAll])

  // Realtime subscriptions
  useEffect(() => {
    if (!room?.id) return
    const roomId = room.id

    const channel = supabase.channel(`room:${roomId}:${Date.now()}`)

    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}`,
    }, (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        setRoom(payload.new as Room)
      }
    })

    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}`,
    }, async () => {
      const { data } = await supabase
        .from('players').select('*').eq('room_id', roomId).order('joined_at')
      if (data) {
        setPlayers(data)
        const uid = getOrCreateUserId()
        const me = data.find(p => p.user_id === uid) ?? null
        setMyPlayer(me)
      }
    })

    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'events', filter: `room_id=eq.${roomId}`,
    }, (payload) => {
      setEvents(prev => [...prev.slice(-59), payload.new as GameEvent])
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room?.id])

  // Explosion countdown — only the current bomb holder fires explodeBomb
  useEffect(() => {
    if (!room?.explosion_at || room?.status !== 'playing') return
    const explosionTime = new Date(room.explosion_at).getTime()
    const holderId = room.bomb_holder_id
    const myPlayerId = myPlayer?.id

    const interval = setInterval(() => {
      const msLeft = explosionTime - Date.now()
      if (msLeft <= 0 && !explodingRef.current && holderId === myPlayerId) {
        explodingRef.current = true
        explodeBomb(room.id).finally(() => {
          setTimeout(() => { explodingRef.current = false }, 2000)
        })
      }
    }, 200)

    return () => clearInterval(interval)
  }, [room?.explosion_at, room?.status, room?.bomb_holder_id, myPlayer?.id, room?.id])

  return {
    room,
    players,
    events,
    myPlayer,
    userId,
    loading,
    error,
    refetch: () => fetchAll(getOrCreateUserId()),
  }
}
