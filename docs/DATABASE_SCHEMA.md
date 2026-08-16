# Database Schema Reference

The real-time game coordination is backed by three primary tables in Supabase (PostgreSQL). Below is the comprehensive layout detailing columns, data types, constraints, and relationships.

---

## 1. `rooms` Table
Holds the metadata, configuration, and current bomb/timer status for game instances.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Unique room ID. |
| `code` | `VARCHAR(6)` | `UNIQUE`, `NOT NULL` | The 6-character room access code. |
| `host_id` | `UUID` | `NOT NULL` | User ID of the player hosting/managing the room. |
| `status` | `VARCHAR(20)` | `NOT NULL`, Default `'waiting'` | Lifecycle state: `waiting`, `playing`, or `finished`. |
| `buy_in` | `NUMERIC` | `NOT NULL`, Default `0` | Payout requirement in XLM (Stellar). |
| `bomb_holder_id` | `UUID` | `FOREIGN KEY` (references `players.id`) | Current player holding the cat bomb. |
| `explosion_at` | `TIMESTAMPTZ` | | Timestamp when the active bomb will detonate. |
| `round_number` | `INT` | `NOT NULL`, Default `1` | Incrementing round count. |
| `created_at` | `TIMESTAMPTZ` | Default `now()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | Default `now()` | Record updated timestamp. |

---

## 2. `players` Table
Tracks player states, wallet links, in-game points, and active power configurations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Unique player record ID. |
| `room_id` | `UUID` | `FOREIGN KEY` (references `rooms.id`), `ON DELETE CASCADE` | Room context the player belongs to. |
| `user_id` | `UUID` | `NOT NULL` | Unique user account ID. |
| `nickname` | `VARCHAR(50)` | `NOT NULL` | Player display name. |
| `avatar` | `VARCHAR(10)` | `NOT NULL` | Selected visual player emoji or avatar code. |
| `points` | `INT` | `NOT NULL`, Default `0` | Accrued game score points. |
| `is_alive` | `BOOLEAN` | `NOT NULL`, Default `true` | Alive status (turns `false` on bomb explosion). |
| `is_frozen` | `BOOLEAN` | `NOT NULL`, Default `false` | Status indicating if player is frozen. |
| `frozen_until` | `TIMESTAMPTZ` | | Expiry timestamp for the freeze state. |
| `shield_active` | `BOOLEAN` | `NOT NULL`, Default `false` | Active state of the shield power-up. |
| `double_points_until` | `TIMESTAMPTZ` | | Expiry timestamp for doubled point multipliers. |
| `reverse_active` | `BOOLEAN` | `NOT NULL`, Default `false` | Reversed direction indicator. |
| `powers` | `JSONB` | `NOT NULL`, Default `'{}'::jsonb` | Active inventory of acquired shop power-ups. |
| `buyin_tx_hash` | `VARCHAR(64)` | `UNIQUE` | Stellar blockchain buy-in transaction signature verification. |
| `joined_at` | `TIMESTAMPTZ` | Default `now()` | Player room join timestamp. |

* **Unique Index constraint**: `unique_player_in_room` on `(room_id, user_id)`.

---

## 3. `events` Table
A linear timestamped log of operations within a room, streaming actions to players.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Unique event action ID. |
| `room_id` | `UUID` | `FOREIGN KEY` (references `rooms.id`), `ON DELETE CASCADE` | Context room reference. |
| `type` | `VARCHAR(20)` | Check constraint: `chat`, `pass`, `power`, `explode`, `join`, `start`, `system` | Category determining client presentation. |
| `player_id` | `UUID` | `FOREIGN KEY` (references `players.id`), `ON DELETE SET NULL` | Originator player context. |
| `nickname` | `VARCHAR(50)` | | Stored copy of player's name for history. |
| `message` | `TEXT` | `NOT NULL` | Content block (chat text, system details, power name). |
| `created_at` | `TIMESTAMPTZ` | Default `now()` | Exact time action took place. |

---

## Realtime Replication Configuration

Realtime tracking uses PostgreSQL Logical Replication publications. The three tables are registered in the replication publisher list:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
```
This configuration allows clients to subscribe to real-time operations using:
```typescript
supabase.channel('room-channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, payload => { ... })
```
