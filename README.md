Catan Mobile
A mobile-first browser implementation of Settlers of Catan with expansion support.
Playable on any device — no install, no frameworks, no build step.
Project Overview
What we're building: A fully playable Catan game that runs in any browser, optimised for mobile devices. Classic Catan is the foundation. Expansions load as separate files and hook into the core without modifying it.
Target audience: Mobile players. Touch-friendly, responsive, works offline once loaded.
Development approach:
Mobile-first design (touch targets, responsive layout, pinch-to-zoom board)
Vanilla JavaScript — no frameworks, no build step, no dependencies
Modular file structure — one file per expansion
Well-commented code written for readability and learning
Progressive feature additions — Classic first, then expansions one at a time
File Structure
index.html        — Page structure, HUD, SVG board container, script load order
catan.css         — All styling including expansion-specific styles at the bottom
catan.js          — Core game engine (board, turns, resources, building, trading)
fishermen.js      — Fishermen of Catan scenario
explorers.js      — Explorers & Pirates expansion
debug.js          — Mobile debugging console
HANDOFF.md        — Full architecture reference for new developers
EP_RULES.md       — Explorers & Pirates rules reference
Script load order in index.html:
<script src="catan.js"></script>
<script src="fishermen.js"></script>
<script src="explorers.js"></script>
Each file sees everything defined by files before it (shared global scope).
Architecture
Hook Pattern
Expansions never modify catan.js directly. Instead, catan.js exposes named hook functions that expansion files override via window.X = function() — and only inside their activation function. This means Classic Catan is completely unaffected when an expansion file is loaded but not yet selected by the player.
Key hooks:
Hook
Purpose
buildPlayerExtensions()
Extra fields merged into each player object
buildBoardOverride()
Replaces buildBoard() entirely if defined
buildGraphCoords
Replaces LAND_COORDS in buildGraph() if defined
getPortRateForResource(type)
Returns trade rate — E&P overrides to always return 3
getVictoryTarget(player)
Returns VP needed to win
runRollDice()
Handles the dice roll phase
runEndTurn()
Handles end of turn
activateRobberMove()
Can be temporarily overridden to suppress robber
Mode Guard Pattern
GAME_CONFIG.mode controls Classic-only features:
Robber only triggers on 7 when mode === 'classic'
Dev cards only available when mode === 'classic'
Longest Road and Largest Army only run when mode === 'classic'
Coordinate System
Flat-top axial hex grid. q increases rightward, r increases downward-right.
CX and CY define the pixel position of tile (0,0) — the board origin point.
Classic Catan:       CX=250, CY=268   viewBox="0 0 500 520"
Explorers & Pirates: CX=50,  CY=268   viewBox="-100 0 950 600"
CX and CY are let (not const) so expansions can reposition the origin for wider boards.
Key Data Structures
Tile object:
{ q, r, terrain, number, isOcean, discovered }
// discovered: E&P only — false = face-down unexplored tile
Edge object (from buildGraph):
{ ax, ay, bx, by, key, isSea }
// isSea: true if edge borders at least one ocean tile — used for ship movement
Player object (Classic fields):
{
  id, name, color,
  resources: { Lumber, Brick, Wool, Grain, Ore },
  villagesPlaced, citiesPlaced,
  roads, villages, cities,        // Sets of edge/vertex keys
  victoryPoints,
  devCards, newDevCards, knightCount,  // from buildPlayerExtensions()
  fish, hasShoe,                  // Fishermen only
}
Player object (E&P additions via buildPlayerExtensions):
{ ships, settlers, harbors, gold }
How to Run
Clone this repository
Open index.html in any web browser
Select players, mode, and VP target on the start screen
Play
No server required. Works locally from the filesystem.
Current Features
Classic Catan
[x] 1–4 player support
[x] Full board generation with no-adjacent-reds token placement
[x] Setup phase (snake draft village + road placement)
[x] Resource collection on dice roll
[x] Bank trading with port rates
[x] Road, settlement, city building
[x] Development cards (knight, VP, road building, year of plenty, monopoly)
[x] Longest Road and Largest Army
[x] Robber (discard on 7, tile blocking, stealing)
[x] Victory point tracking and win detection
[x] Roll dice overlay with per-player earnings
[x] Pinch-to-zoom and pan board
Fishermen of Catan
[x] Lake tile replaces desert
[x] Fishery tiles on non-port ocean hexes
[x] Fish token pool with Old Shoe
[x] Fish market (5 purchase options)
[x] Setup bonus fish for second settlement
[x] Old Shoe VP penalty and passing rules
Explorers & Pirates
[x] Full board layout — 6-7-8-8-8-7-6 flat hexagon (50 tiles)
[x] Starting island (15 land tiles, face-up)
[x] Two unexplored areas (6 tiles each, face-down)
[x] No-adjacent-reds token placement per island
[x] 3:1 universal trade, no ports
[x] No robber, discard on 7 still applies
[x] No dev cards, no longest road
[x] Sea edge classification (isSea flag on all edges)
[x] Ship data model and edge adjacency graph
[ ] Phase 3: Ship SVG rendering
[ ] Phase 4: Ship movement (BFS on edge adjacency)
[ ] Phase 5: Tile discovery
[ ] Phase 6: Settlers and harbor settlements
[ ] Phase 7: Gold economy and compensation
[ ] Phase 8: Pirate lairs and crews
[ ] Phase 9: Fish and spice missions
[ ] Phase 10: Full scenario 5
Planned Expansions
[ ] Cities & Knights — additive on Classic, will live in citiesknights.js
[ ] Seafarers — shares ship mechanics with E&P
Development Notes
Surgical diffs only — never rewrite catan.js wholesale
Expansion overrides must live inside the expansion's activation function, not at top level
LAND_COORDS, OCEAN_COORDS, HEX_DIRS are Classic constants — do not modify
Player model extensions go in buildPlayerExtensions() — not directly in catan.js
Expansion-specific CSS goes at the bottom of catan.css
See HANDOFF.md for full architecture context and Bolt.new onboarding
See EP_RULES.md for complete Explorers & Pirates rules reference
Mobile Debugging
Press the Debug button (bottom-left during gameplay) to open the in-game console:
JavaScript errors with line numbers
Console logs and warnings
Clear button to reset the log
Essential for catching issues while testing on a real mobile device.
Code Style
Comments explain why, not what
Complex game rules are commented with the rule source
Section headers: /* ================================================================ SECTION N · NAME ================================================================ */
Related functions grouped within sections
Expansion files mirror the same section comment style