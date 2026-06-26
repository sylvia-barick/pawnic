-- PAWnic Supabase Database Schema
-- Run this script in the Supabase SQL Editor to set up the necessary tables.

-- Drop existing tables/constraints if they exist (for clean setup)
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- 1. Create rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) UNIQUE NOT NULL,
    host_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    buy_in NUMERIC NOT NULL DEFAULT 0,
    bomb_holder_id UUID, -- References players.id (defined as foreign key below)
    explosion_at TIMESTAMPTZ,
    round_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    avatar VARCHAR(10) NOT NULL,
    points INT NOT NULL DEFAULT 0,
    is_alive BOOLEAN NOT NULL DEFAULT true,
    is_frozen BOOLEAN NOT NULL DEFAULT false,
    frozen_until TIMESTAMPTZ,
    shield_active BOOLEAN NOT NULL DEFAULT false,
    double_points_until TIMESTAMPTZ,
    reverse_active BOOLEAN NOT NULL DEFAULT false,
    powers JSONB NOT NULL DEFAULT '{}'::jsonb,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_player_in_room UNIQUE (room_id, user_id)
);

-- 3. Add foreign key constraint to rooms for bomb_holder_id
ALTER TABLE rooms ADD CONSTRAINT fk_bomb_holder FOREIGN KEY (bomb_holder_id) REFERENCES players(id) ON DELETE SET NULL;

-- 4. Create events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('chat', 'pass', 'power', 'explode', 'join', 'start', 'system')),
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    nickname VARCHAR(50),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Enable Row Level Security (RLS) and set open access policies
-- Since this game does not require user authentication (users are identified by generated client UUIDs),
-- we open the policies for reading, inserting, updating, and deleting.
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete rooms" ON rooms FOR DELETE USING (true);

CREATE POLICY "Allow public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update players" ON players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete players" ON players FOR DELETE USING (true);

CREATE POLICY "Allow public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow public insert events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update events" ON events FOR UPDATE USING (true);
CREATE POLICY "Allow public delete events" ON events FOR DELETE USING (true);

-- 6. Enable Realtime replication for collaborative multiplayer syncing
-- Run these statements to add the tables to the supabase_realtime publication.
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
