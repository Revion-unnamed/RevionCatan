Catan Mobile — Developer Handoff
What this project is
A mobile-first Settlers of Catan implementation in vanilla HTML/CSS/JS (no frameworks).
Three files form the core: index.html, catan.css, catan.js.
Expansions live in separate files that load after catan.js.
File load order
<script src="catan.js"></script>
<script src="fishermen.js"></script>
<script src="explorers.js"></script>
Each file can see everything defined by files before it (shared global scope).
Architecture — the hook pattern
catan.js exposes named hook functions that expansion files override via window.X = function().
All overrides are defined inside the expansion's epInit() / activation function — never at top level.
This ensures Classic Catan is completely unaffected when an expansion file is loaded but not activated.
Current hooks (defined in catan.js, overrideable by expansions)
Hook
Section
Purpose
buildPlayerExtensions()
11
Returns extra fields merged into each player object
buildBoardOverride()
20
If defined, replaces buildBoard() entirely
buildGraphCoords
20
If defined, replaces LAND_COORDS in buildGraph()
getPortRateForResource(type)
15
Returns trade rate for a resource
getVictoryTarget(player)
18
Returns VP needed to win for a player
runRollDice()
12
Handles the dice roll phase
runEndTurn()
12
Handles end of turn
activateRobberMove()
16
Can be temporarily overridden to suppress robber
Mode guard pattern
GAME_CONFIG.mode is checked throughout catan.js:
Robber only triggers on 7 when mode === 'classic'
Dev cards only work when mode === 'classic'
Longest Road only runs when mode === 'classic'
Coordinate system
Flat-top axial hex grid. q increases rightward, r increases downward-right.
hexToPixel(q, r) converts to SVG pixel coordinates using CX and CY as the origin.
CX, CY = pixel position of tile (0,0) on screen
Classic Catan: CX=250, CY=268, viewBox="0 0 500 520"
Explorers & Pirates: CX=50, CY=268, viewBox="-100 0 950 600" (set in epInit())
CX and CY are let (not const) so expansions can reposition the board origin.
Key data structures
Tile object
{ q, r, terrain, number, isOcean, discovered }
discovered is E&P only — false = face-down unexplored tile.
Edge object (from buildGraph)
{ ax, ay, bx, by, key, isSea }
isSea = true if the edge borders at least one ocean/sea tile. Used for ship movement.
Player object (classic)
{
  id, name, color,
  resources: { Lumber, Brick, Wool, Grain, Ore },
  villagesPlaced, citiesPlaced,
  roads, villages, cities,   // all Sets of edge/vertex keys
  victoryPoints,
  devCards, newDevCards, knightCount,  // classic only — from buildPlayerExtensions()
  fish, hasShoe,             // fishermen only
}
Player object (E&P additions via buildPlayerExtensions)
{ ships, settlers, harbors, gold }
Expansion files
fishermen.js — Fishermen of Catan
Additive overlay on Classic. Activated via toggle on start screen.
Fish tokens, Old Shoe, fish market with 5 purchase options
Lake tile replaces desert when active
Fishery tiles on ocean hexes without ports
All logic self-contained; hooks into Classic via collectFish(roll) call in roll handler
explorers.js — Explorers & Pirates (in progress)
Full mode replacement. Activated via mode button on start screen.
Entry point: epInit() — defines all overrides inside itself.
Board layout: 6-7-8-8-8-7-6 flat hexagon (50 tiles)
Starting island: leftmost 2-2-2-3-2-2-2 tiles (15 land tiles, all face-up)
Northern unexplored: 6 tiles face-down, upper right
Southern unexplored: 6 tiles face-down, lower right
Sea hexes: 23 tiles, always face-up
Currently implemented:
Board generation with buildBoardOverride (inside epInit)
Sea edge classification via isSea flag in buildGraph
Edge adjacency map (epEdgeAdjacency) for ship movement BFS
3:1 universal trade (no ports)
No robber on 7 (discard rule still applies)
No dev cards, no longest road
Next phases:
Phase 3: Ship SVG rendering (centred on edge, rotated to edge angle)
Phase 4: Ship movement (BFS on epEdgeAdjacency, highlight reachable edges)
Phase 5: Discovery (reveal face-down tiles when ship endpoint touches them)
Phase 6: Settlers + harbor settlements
CSS notes
All expansion-specific styles go at the bottom of catan.css
Fishermen styles: #fish-market-btn, #fish-market-panel, .fish-action-btn, #shoe-panel
E&P styles: to be added as phases are implemented
What NOT to do
Do not rewrite catan.js wholesale — use surgical diffs only
Do not define overrides at top level in expansion files — they must live inside the activation function
Do not change LAND_COORDS, OCEAN_COORDS, or HEX_DIRS — Classic depends on these exactly
Do not change CX/CY as constants — they are already let
Do not add expansion-specific fields directly to the player object in catan.js — use buildPlayerExtensions()