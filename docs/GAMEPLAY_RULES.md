# PAWnic Gameplay & In-Game Mechanics

PAWnic is a real-time hot-potato survival game. This guide covers how round timers, point distributions, and power abilities behave.

---

## 1. Game Flow & Rounds

1. **Lobby Phase**: Players join using room codes. Once all players are ready, the host starts the match.
2. **Bomb Spawn**: A neon cat bomb is randomly assigned to a player. The server schedules an explosion timestamp (`explosion_at`) on the database room record.
3. **Passing the Bomb**:
   * The holder must select a player and pass.
   * If the target has a **Shield** or **Mirror** active, the bomb behaves according to the power's rules (detailed below).
4. **Explosion**: If the timer reaches `explosion_at` before a player passes, the bomb explodes. The holder's `is_alive` state is updated to `false`.
5. **Survival Check**: If more than one player is still alive, a new round begins, and the bomb is handed to a new survivor. If only one player survives, the match ends, and the pot is disbursed.

---

## 2. Point Accrual

* While you hold the bomb, you generate points continuously.
* Holding points are accumulated in real-time.
* **Double Points**: When Catnip is active, point gains are doubled.

---

## 3. Power-Ups (Shop)

Earned points can be spent in the Shop Panel on modifiers.

| Power-Up | Point Cost | Mechanic |
|---|---|---|
| 🔮 **Mirror** | 100 pts | Reflects the next incoming pass transaction back to the sender automatically. |
| ❄️ **Freeze** | 80 pts | Targets a player, setting `is_frozen` to `true` and blocking them from passing the bomb for 10 seconds. |
| 🌿 **Catnip** | 60 pts | Sets `double_points_until` on the player, doubling point gains for 10 seconds. |
| ☁️ **Smoke Screen** | 70 pts | Temporarily hides the player's name and indicators from the board. |
| 🐱 **Nine Lives** | 150 pts | Revives the player on detonation, saving them from one explosion. |
| 🛡️ **Shield** | 50 pts | Actively blocks incoming passes, sending the cat bomb back to the sender. |
