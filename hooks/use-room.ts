'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Room, Player, GameEvent } from '@/lib/types'
import { explodeBomb, incrementHolderPoints } from '@/app/actions/game'

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

  // Reaction System State
  const [reactions, setReactions] = useState<{ id: string; playerId: string; emoji: string; xOffset: number }[]>([])
  const channelRef = useRef<any>(null)

  const addReaction = useCallback((playerId: string, emoji: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    const xOffset = Math.floor(Math.random() * 30) - 15
    setReactions(prev => [...prev, { id, playerId, emoji, xOffset }])
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id))
    }, 2000)
  }, [])

  const sendReaction = useCallback((emoji: string) => {
    if (!myPlayer) return
    addReaction(myPlayer.id, emoji)
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { playerId: myPlayer.id, emoji }
      })
    }
  }, [myPlayer, addReaction])

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

    const channel = supabase.channel(`room:${roomId}`)

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

    // Listen for reactions broadcast
    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      if (payload && payload.playerId && payload.emoji) {
        addReaction(payload.playerId, payload.emoji)
      }
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [room?.id, addReaction])

  // Explosion countdown — any active visible client can trigger the explosion
  useEffect(() => {
    if (!room || !room.explosion_at || room.status !== 'playing') return
    const explosionTime = new Date(room.explosion_at).getTime()
    const roomId = room.id

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const msLeft = explosionTime - Date.now()
      if (msLeft <= 0 && !explodingRef.current) {
        explodingRef.current = true
        explodeBomb(roomId).finally(() => {
          setTimeout(() => { explodingRef.current = false }, 2000)
        })
      }
    }, 200)

    return () => clearInterval(interval)
  }, [room?.explosion_at, room?.status, room?.id])

  // Points accumulation timer — any active visible client drives this
  useEffect(() => {
    if (!room || room.status !== 'playing' || !room.bomb_holder_id) return

    const roomId = room.id
    const holderId = room.bomb_holder_id

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      incrementHolderPoints(roomId, holderId)
    }, 1000)

    return () => clearInterval(interval)
  }, [room?.status, room?.bomb_holder_id, room?.id])

  return {
    room,
    players,
    events,
    myPlayer,
    userId,
    loading,
    error,
    reactions,
    sendReaction,
    refetch: () => fetchAll(getOrCreateUserId()),
  }
}
