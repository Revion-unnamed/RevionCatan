# ULTIMATE CATAN — Game Design Document v0.1
*Combining: Catan Base + Cities & Knights + Traders & Barbarians + Explorers & Pirates*
*Format: Mobile HTML game, 3–4 players, single session*

---

## 1. DESIGN PHILOSOPHY

Each expansion keeps its **mechanical identity** but is **interlocked** with the others through shared resources, shared threats, and shared geography. No expansion is optional mid-game — all systems are active from turn 1.

The guiding principle: **every action should touch at least two systems.**
- Building a road near a river earns gold (T&B) AND extends your knight network (C&K)
- Sending a ship to explore (E&P) might reveal a fish ground (T&B) AND a pirate lair (E&P)
- Upgrading a city (C&K) unlocks progress cards AND produces commodities needed for wagon upgrades (T&B)

---

## 2. MAP ARCHITECTURE

### 2.1 Home Island (Fixed)
Standard Catan island layout — 19 hexes, classic resource distribution.

**Modifications from base:**
- The desert hex is replaced by the **Fortress Hex** (T&B Burgfeld). This is a special neutral hex. Knights trained at the Fortress defend the coastline.
- Two river hexes run through the island (from T&B Flüsse). These are pre-placed, not random. They divide the island into natural territories.
- The island has 6 coastal fish grounds on the frame (T&B Fischer), placed on frame edges at numbers 4, 5, 6, 8, 9, 10.
- No harbors on the home island frame — harbors are found by exploration only (see 2.2).

### 2.2 Outer Sea (Explorable)
The home island is surrounded by a ring of **face-down hex tiles**. These are revealed when a ship's bow or stern points at an unexplored hex edge (E&P rule).

**Outer hex pool (shuffled face-down):**

| Type | Count | Notes |
|------|-------|-------|
| Standard resource hexes | 8 | With number tokens (green/orange per E&P) |
| Fish fields | 5 | T&B Fischfelder, numbered 1–6 for catch die |
| Spice islands | 4 | E&P Gewürzfelder, place spice sacks on discovery |
| Gold river hexes | 3 | T&B gold — roads/settlements adjacent earn gold |
| Pirate lair hexes | 3 | E&P Piratenlager — must be conquered with units |
| Sea hexes (empty) | 6 | No number token, 2 gold discovery reward |

**Discovery rewards** (on flip):
- Resource hex → 1 free resource of that type
- Fish field → 2 gold
- Spice island → 2 gold + place spice sacks
- Gold river → 2 gold
- Pirate lair → 2 gold + place pirate lair token
- Sea hex → 2 gold

### 2.3 Target Hexes (Wagon Transport, T&B)
Three fixed target hexes are placed at the far edges of the outer map at game start, **face-up but inaccessible** until ships reach their region:
- **The Fortress** (receives Marble + Glass)
- **The Quarry** (receives Tools, produces Marble + Sand)
- **The Glassworks** (receives Sand, produces Glass + Tools)

These are the destination nodes for the T&B wagon transport mission.

---

## 3. TURN STRUCTURE

Each player's turn has **four phases**, executed in order:

### Phase 1: Event & Yield
1. Roll all 3 dice simultaneously: **2 number dice + 1 event die**
2. Resolve **event die** first (C&K):
   - Ship symbol → advance barbarian ship 1 space on track
   - Science/Trade/Politics symbol → all players check for progress card eligibility
3. Resolve **number dice** (sum):
   - Not 7 → resource yield for all (settlements = 1 resource, cities = 1 resource + 1 commodity if Wald/Weideland/Gebirge)
   - 7 → Robber activates (see Threat System)
4. After yield: all players with a city on a **river hex** collect 1 gold per adjacent road/settlement (T&B passive income)

### Phase 2: Fish Action (Optional)
Before trading, the active player may spend fish tokens for actions:
- 2 fish → remove robber to outer sea (place on any non-home sea hex)
- 3 fish → steal 1 resource from any player
- 4 fish → take 1 free resource from bank
- 5 fish → build 1 free road
- 7 fish → take 1 free progress card (from any stack you qualify for)

### Phase 3: Trade & Build
Standard trading rules apply. Build any combination of:
- Roads (1 wood + 1 brick)
- Settlements (1 wood + 1 brick + 1 wool + 1 grain)
- Cities (2 grain + 3 ore)
- City walls (2 brick) — C&K, protect against robber card loss
- Knights: build einfach (1 wool + 1 ore), activate (1 grain)
- Knight upgrade: starker Ritter (1 wool + 1 ore, requires Festung built)
- Knight upgrade: mächtiger Ritter (1 wool + 1 ore, requires Festung level 3)
- City upgrades (commodities, per C&K Fortschritt-Tableau)
- Bridges (2 brick + 1 wood) — T&B, only on 7 designated bridge slots on river
- Harbor settlement upgrade (2 grain + 2 ore) — E&P, only on coastal settlements

Also in this phase (any order):
- Play progress cards (C&K, except Alchemie which plays before dice)
- Move wagon (T&B Tross) — see Section 6
- Knight actions: move, displace, chase robber (C&K rules)

### Phase 4: Ship Movement (E&P)
After building, the active player moves all their ships. Ships follow E&P movement rules:
- Each ship has 4 movement points (upgradeable via spice island Schnelle Fahrt bonus)
- Moving over a road = 1 point, no road = 2 points
- Pirate ship blocks sea hexes (tribute 1 gold to pass)
- Discovering a new hex **ends that ship's movement**
- Landing a settler on a new island costs the ship + settler figure (placed as free settlement)

---

## 4. ECONOMIES

Three distinct economies operate in parallel. They do **not** convert into each other except through specific cards or actions.

### 4.1 Resources (Base)
Wood, Brick, Wool, Grain, Ore. Standard Catan acquisition. Used for building everything.

### 4.2 Commodities (C&K)
Paper (from forest cities), Cloth (from pasture cities), Coin (from mountain cities).
Used exclusively for city upgrades on the Fortschritt-Tableau.
- Gild bonus (level 3 Trade): spend 2 commodities 2:1 for any resource or commodity

### 4.3 Gold (T&B)
Earned passively from river hexes (roads/settlements adjacent) and actively from bridges (3 gold per bridge built), wagon deliveries (1–5 gold per delivery based on wagon level), and pirate lair conquest (2 gold per participant).

Gold uses:
- 2 gold → buy any 1 resource (up to twice per turn)
- Pay tolls on other players' roads when moving wagon (1 gold per road used)
- Pay tribute to pirate ship (1 gold per ship passing)

**Armer Siedler / Reichster Siedler:** The player with the most gold holds the Reichster Siedler card (+1 VP). All players with the least gold hold the Armer Siedler card (−2 VP). Both update after every gold transaction.

---

## 5. THREAT SYSTEM (Merged C&K + T&B)

### 5.1 The Barbarian Ship (C&K Event Die)
The barbarian ship advances on its track each time the event die shows the ship symbol. When it reaches Catan, a **Barbarian Assault** triggers immediately.

### 5.2 Barbarian Assault Resolution
This merges C&K's city-loss mechanic with T&B's coastal occupation mechanic.

**Step 1 — Strength comparison (C&K):**
- Barbarian strength = total number of cities + metropolises on the board
- Catan strength = sum of all activated knight flag-tips

**Step 2 — If barbarians win (Catan strength < Barbarian strength):**
- The player(s) with fewest activated knights lose 1 city (downgraded to settlement)
- Additionally: roll 3 dice (not 7) to place **3 barbarians on coastal hexes** (T&B Küstenfelder rule)
- Coastal hexes with 3 barbarians flip their number token (no yield until recaptured)
- Settlements/cities surrounded only by barbarian-occupied coastal hexes are **conquered** (laid on side, 0 VP)

**Step 3 — If Catan wins (Catan strength ≥ Barbarian strength):**
- Player with most activated knight tips earns 1 VP chip
- Tie → all tied players draw 1 progress card from any eligible stack
- No coastal barbarians are placed

**Step 4 — Cleanup:**
- All activated knights deactivate (helmets removed)
- Barbarian ship returns to start
- Barbarians already on coastal hexes remain until recaptured by knights

### 5.3 Recapturing Coastal Hexes (T&B Knights)
A player may use an activated knight adjacent to a barbarian-occupied coastal hex to **expel barbarians**:
- Knight must be on a road/path adjacent to the coastal hex
- Spend the knight's action: roll 1 die. On 4+, expel 1 barbarian from that hex
- When all 3 barbarians are removed, the number token flips back. All conquered settlements/cities adjacent are restored.
- The expelling player earns 1 captured barbarian token (every 2 tokens = 1 VP, T&B rule)

### 5.4 The Pirate (E&P)
Separate from the barbarian system. The pirate ship occupies sea hexes and blocks ship movement (1 gold tribute to pass). Rolled on a 7 (player places/moves their pirate ship and may steal 1 resource from a player with a ship on an adjacent sea hex). Pirate lairs on discovered hexes must be conquered with unit figures (E&P Piratenlager rules apply unchanged).

---

## 6. WAGON TRANSPORT (T&B Händler & Barbaren)

Each player has 1 wagon (Trossfigur), placed beside their starting city at game start.

### 6.1 Wagon Movement
- Moved at the end of Phase 3 (after building)
- Base movement: 4 points
- Moving over a road (own): 1 point
- Moving over a road (other player's): 1 point + pay 1 gold toll to that player
- Moving over a path (no road): 2 points
- Barbarian on a road/path: +2 points to cross (or attempt expulsion)
- Spending 1 grain: +2 bonus movement points (once per turn)

### 6.2 Cargo & Delivery
- When wagon first arrives at a target hex, it picks up a **cargo card** (flipped face-up, shows which good to deliver to which target)
- Wagon must travel to the destination target hex with the cargo
- On arrival: cargo card flips to VP side (counts as 1 VP permanently)
- Wagon earns gold based on current wagon upgrade level (1–5 gold)
- Player then immediately draws a new cargo card from the same target hex stack

### 6.3 Wagon Upgrades
Wagon has 5 upgrade levels (T&B Trosskarten). Each level costs resources shown on the card. At level 5, the Trosskarte itself counts as 1 VP.

Upgrades improve:
- Movement points (4 → 5 → 5 → 6 → 7)
- Gold reward per delivery (1 → 2 → 3 → 4 → 5)
- Barbarian expulsion die threshold (need 6 → 5 → 5 → 4 → 4)

---

## 7. FISHING (T&B Fischer von Catan)

### 7.1 Setup
- 6 fish grounds on the home island frame (numbers 4,5,6,8,9,10) — each marks 3 adjacent coastal intersections as fishing spots
- The lake hex (See) replaces one inner hex and yields fish on 2, 3, 11, 12
- Fish token deck shuffled face-down (includes 1 "old boot" token)
- Additional fish fields discoverable in outer sea (see Section 2.2)

### 7.2 Catching Fish
- Settlement on a fishing intersection → draw 1 fish token when that number is rolled
- City on a fishing intersection → draw 2 fish tokens
- Fish tokens are kept face-down (player may look at own tokens)
- Max 7 fish tokens per player. If at 7, swap 1 token with the deck instead.

### 7.3 The Old Boot
Drawn immediately on receipt, revealed face-up. Passed to any player with ≥ equal VPs. Holder needs 1 extra VP to win (11 instead of 13 in this ruleset). Cannot be discarded otherwise.

### 7.4 Fish Actions
Spent during Phase 2 (Fish Action phase), before Trade & Build. See Section 3 Phase 2.

---

## 8. RIVERS & BRIDGES (T&B Flüsse von Catan)

### 8.1 River Layout
Two rivers run through the home island (pre-placed). Each river is a chain of hex edges marked as "river paths." Roads cannot be built on river edges — only bridges can span them.

River-adjacent intersections are marked as **river crossings**.

### 8.2 Gold from Rivers
- Building a road on a river-adjacent path (parallel to river): earn 1 gold immediately
- Building a settlement on a river crossing: earn 1 gold immediately
- Upgrading a settlement on a river crossing to city: no gold (upgrade only)
- Passive: each turn during Phase 1, active player collects gold for all their roads/settlements adjacent to rivers (1 gold each, up to twice per turn total — see Phase 1 step 4)

### 8.3 Bridges
- Cost: 2 brick + 1 wood
- Placed on designated bridge slots only (7 slots across both rivers)
- Must connect to own road or settlement
- Building a bridge earns 3 gold immediately
- Counts as a road for Longest Road purposes
- Each player max 3 bridges total

---

## 9. CITY UPGRADES & METROPOLISES (C&K)

Unchanged from Cities & Knights with the following addition:

**Commodities from discovered outer hexes:** Harbor settlements built on outer resource hexes also produce commodities if the hex type matches (forest→paper, pasture→cloth, mountain→coin). This rewards exploration with C&K economic acceleration.

**Aquädukt interaction with fishing:** If a player has built the Aquädukt (Wissenschaft level 3), when they would draw a fish token (from catching), they may instead take 1 free resource. This creates a choice: fish economy vs. resource economy.

---

## 10. VICTORY POINTS

Target: **15 VP** to win (increased from 13 to account for additional VP sources).

| Source | VP |
|--------|-----|
| Settlement | 1 |
| City | 2 |
| Metropolis (on a city) | +2 (total 4) |
| Longest Road (≥5) | 2 |
| Harbor Settlement (E&P) | 2 |
| Progress card VP (Buchdruck, Verfassung) | 1 each |
| Barbarian victory chip | 1 |
| Barbarian prisoners (per 2 tokens) | 1 |
| Wagon cargo delivered (per card) | 1 |
| Wagon level 5 reached | 1 |
| Händler token (held) | 1 |
| Reichster Siedler (held) | 1 |
| Armer Siedler (held) | −2 |
| Old Boot (held) | +1 needed to win |
| Mission VP (E&P pirate lairs, fish for council, spices) | 1–3 per mission |

---

## 11. E&P MISSIONS

Three mission tracks run in parallel throughout the game (E&P Missionskarten):

1. **Die Piratenlager** — conquer pirate lairs with units. Most lairs conquered = mission VP leader chip (1 VP)
2. **Fische für Catan** — catch fish swarms from outer fish fields and deliver to Catanian Council station. Progress = VP on mission track
3. **Gewürze für Catan** — trade units to spice island villages, return spice sacks to Council. Progress = VP on mission track + permanent ship speed/combat bonuses

Mission VP leader chips float — whoever is furthest on each track holds the chip.

---

## 12. KNIGHT SYSTEM (Combined C&K + T&B)

C&K knights function as normal (build, activate, upgrade, perform actions).

**Additional T&B coastal defense role:**
- A knight adjacent to a barbarian-occupied coastal hex may expel barbarians (Section 5.3)
- A knight on a coastal intersection is considered to be "garrisoning" that coast — it counts +1 to Catan's defense strength during barbarian assaults for the coastal hex it guards
- T&B's Ritterweihe card (from T&B Barbarenüberfall scenario) is added to the progress card deck as a Wissenschaft card: "Place 1 of your knights on any free path of the Fortress hex immediately"

---

## 13. ROBBER RULES

The robber starts on the Fortress hex (center of home island).

It cannot be moved until the barbarians have attacked Catan for the first time (C&K rule). After first attack, the robber moves to the desert/wüste marker.

Once active: standard robber rules apply. A player with fish tokens cannot have fish stolen (fish are not resources). Gold cannot be stolen. Commodities CAN be stolen.

---

## 14. STARTING SETUP

1. Place home island (19 hexes, standard layout but desert replaced by Fortress hex, 2 river hex chains pre-inserted)
2. Place fish grounds on 6 frame edges
3. Lay outer sea ring face-down (shuffled hex pool)
4. Place 3 target hexes at outer edges (face-up, inaccessible)
5. Each player places: 1 harbor settlement + 1 settlement (founding phase, E&P style)
   - Harbor settlement must be on a coastal intersection
   - Settlement may be anywhere legal (abstandsregel applies)
   - Each player places 1 road from their settlement + 1 ship from their harbor settlement
6. Starting resources: 1 per adjacent landscape for the settlement (not harbor settlement)
7. Starting gold: 0
8. Starting fish tokens: 0
9. Each player takes: wagon figure, 3 bridges, 6 knights (2 per tier), 6 helmets, 3 city walls, 3 metropolis pieces, Fortschritt-Tableau, Trosskarte deck (sorted 1–5)
10. Reveal first Trosskarte (level 1) for each player
11. Place barbarian ship at start of track
12. Place pirate ship off-board (enters on first 7)
13. Shuffle fish token deck (including old boot)
14. Lay out 3 mission cards + VP chips
15. Shuffle progress card decks (Wissenschaft, Handel, Politik) face-down

---

## 15. OPEN DESIGN QUESTIONS (TO RESOLVE DURING BUILD)

- [ ] Does the wagon block roads for other wagons? (Suggest: no, wagons pass through each other)
- [ ] Can ships carry wagon cargo? (Suggest: yes, 1 cargo slot on ship, +1 movement cost to load)
- [ ] Does the Aquädukt interact with outer fish fields too? (Suggest: yes)
- [ ] Is Armer Siedler active from turn 1, or only after the first gold is earned? (Suggest: after first gold earned by any player)
- [ ] Should rivers in the outer sea (discovered gold river hexes) also produce passive gold? (Suggest: yes, same rule as home river hexes)
- [ ] Maximum players at 15 VP or adjust per player count? (Suggest: fixed 15 regardless)
- [ ] Does the Händler progress card interact with gold river hexes? (Suggest: no — gold is not a resource)

---

## 16. IMPLEMENTATION ROADMAP (HTML Mobile Game)

### Phase 1 — Foundation
- Hex grid renderer (home island + outer sea frame)
- Tile data model (resource type, number token, state)
- Player state model (resources, commodities, gold, fish, VPs, buildings)
- Basic turn structure (phases 1–4)
- Dice system (2 number dice + event die)

### Phase 2 — Core Economies
- Resource yield engine
- Commodity yield engine (cities on forest/pasture/mountain)
- Gold passive income (river adjacency)
- Fish token draw system

### Phase 3 — Building System
- Road/settlement/city placement (with adjacency rules)
- Bridge placement (river slots only)
- Harbor settlement upgrade
- Knight build + activate + upgrade

### Phase 4 — Threat System
- Barbarian ship track + event die trigger
- Barbarian assault resolution (merged C&K + T&B)
- Coastal hex occupation + reconquest
- Pirate ship placement + tribute

### Phase 5 — Exploration
- Ship movement (E&P rules)
- Hex discovery (flip + reward)
- Settler landing → free settlement
- Mission track updates

### Phase 6 — Wagon Transport
- Wagon movement engine (toll calculation, barbarian crossing)
- Cargo card system
- Target hex delivery → VP
- Wagon upgrade system

### Phase 7 — Progress Cards & City Upgrades
- Fortschritt-Tableau UI per player
- Progress card deck draw (event die + red die condition)
- All 18 progress card effects implemented

### Phase 8 — Victory & Polish
- VP calculation (all sources)
- Win condition check (15 VP on your turn)
- Armer/Reichster Siedler floating VP
- Old Boot tracking
- Mobile UI polish

---

*GDD v0.1 — ready for implementation*
