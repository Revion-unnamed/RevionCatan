/* ================================================================
   explorers.js — Catan: Explorers & Pirates
   Depends on: catan.js (must load first)

   Load order in index.html:
     <script src="catan.js"></script>
     <script src="fishermen.js"></script>   ← only if also using fishermen
     <script src="explorers.js"></script>

   This file overrides the hook functions defined in catan.js to
   replace Classic Catan with the Explorers & Pirates rule set.
   It never modifies catan.js internals directly.

   All overrides are defined INSIDE epInit() so they only exist
   when E&P mode is actually activated — never during Classic play.

   Scenarios implemented:
     [ ] Scenario 1 · Land Ho!          — ships, settlers, harbor settlements
     [ ] Scenario 2 · Pirate Lairs      — crews, pirate ship, pirate lairs
     [ ] Scenario 3 · Fish for Catan    — fish shoals, fish delivery
     [ ] Scenario 4 · Spices for Catan  — spice hexes, spice delivery
     [ ] Scenario 5 · Explorers & Pirates — all mechanics combined
   ================================================================ */


/* ================================================================
   EP SECTION 1 · MODE ACTIVATION
   ================================================================ */

function activateExplorersMode() {
  GAME_CONFIG.mode    = 'explorers';
  GAME_CONFIG.vpToWin = 8; // Scenario 1 (Land Ho!) target
}


// ── Full board layout: 6-7-8-8-8-7-6 flat hexagon (50 tiles total) ──

// --- Starting island (15 land tiles, leftmost 2-2-2-3-2-2-2 of each row) ---
const EP_START_COORDS = [
  { q:  1, r: -3 }, { q:  2, r: -3 },
  { q: 0, r: -2 }, { q:  1, r: -2 },
  { q: -1, r: -1 }, { q:  0, r: -1 },
  { q: -2, r:  0 }, { q: -1, r:  0 }, { q:  0, r:  0 },
  { q: -2, r:  1 }, { q: -1, r:  1 },
  { q: -2, r:  2 }, { q: -1, r:  2 },
  { q: -2, r:  3 }, { q: -1, r:  3 },
];

// Terrains shuffled from base game pool per rulebook
const EP_START_TERRAINS_POOL = [
  'fields', 'fields', 'hills', 'hills', 'mountains',
  'pasture', 'forest', 'pasture', 'forest', 'fields',
  'hills', 'mountains', 'mountains', 'pasture', 'forest',
];

// Number tokens — fixed positions per rulebook Example 2
const EP_START_TOKENS = [11, 5, 3, 9, 10, 8, 4, 6, 6, 3, 11, 9, 4, 5, 10];

// --- Northern unexplored area (6 tiles, face-down, upper right) ---
const EP_NORTH_COORDS = [
  { q:  4, r: -3 }, { q:  5, r: -3 },
  { q:  4, r: -2 }, { q:  5, r: -2 },
  { q:  3, r: -1 }, { q:  4, r: -1 },
];

// --- Southern unexplored area (6 tiles, face-down, lower right) ---
const EP_SOUTH_COORDS = [
  { q:  3, r:  1 }, { q:  4, r:  1 },
  { q:  2, r:  2 }, { q:  3, r:  2 },
  { q:  1, r:  3 }, { q:  2, r:  3 },
];

// --- Sea hexes (23 tiles, always face-up) ---
const EP_SEA_COORDS = [
  { q:  3, r: -3 }, { q:  6, r: -3 },
  { q:  2, r: -2 }, { q:  3, r: -2 }, { q:  6, r: -2 },
  { q:  1, r: -1 }, { q:  2, r: -1 }, { q:  5, r: -1 }, { q:  6, r: -1 },
  { q:  1, r:  0 }, { q:  2, r:  0 }, { q:  3, r:  0 }, { q:  4, r:  0 }, { q:  5, r:  0 },
  { q:  0, r:  1 }, { q:  1, r:  1 }, { q:  2, r:  1 }, { q:  5, r:  1 },
  { q:  0, r:  2 }, { q:  1, r:  2 }, { q:  4, r:  2 },
  { q:  0, r:  3 }, { q:  3, r:  3 },
];

// Terrain pools for unexplored areas — shuffled at game start
const EP_NORTH_TERRAINS = ['forest', 'pasture', 'fields', 'hills', 'mountains', 'fields'];
const EP_SOUTH_TERRAINS = ['forest', 'hills', 'mountains', 'pasture', 'fields', 'mountains'];

// Number token pools — 6 tokens each, shuffled separately
const EP_NORTH_TOKENS = [3, 4, 5, 6, 9, 10];
const EP_SOUTH_TOKENS = [4, 5, 6, 8, 10, 11];

/* ================================================================
   EP SECTION 3 · SHIP DATA MODEL (state — safe at top level)
   Empty until E&P mode runs. Never affects Classic.
   ================================================================ */

// All active ships: [{ edgeKey, playerId, hold, movesLeft }]
let epShips = [];

// Edge adjacency map for ship movement — built in Phase 2
let epEdgeAdjacency = new Map();
let epSeaEdges      = new Set(); // all sea edge keys — populated by epBuildEdgeAdjacency

/**
 * epBuildEdgeAdjacency — computes sea edge adjacency.
 * Builds full tile list, calls buildGraph with isSea tagging,
 * then constructs BFS graph of sea edges.
 */
function epBuildEdgeAdjacency() {
  // Build full tile list so buildGraph can tag isSea correctly
  const allTiles = [
    ...EP_START_COORDS.map(c  => ({ ...c, isOcean: false })),
    ...EP_SEA_COORDS.map(c    => ({ ...c, isOcean: true  })),
    ...EP_NORTH_COORDS.map(c  => ({ ...c, isOcean: false })),
    ...EP_SOUTH_COORDS.map(c  => ({ ...c, isOcean: false })),
  ];

  const { edges } = buildGraph(window.buildGraphCoords, allTiles);

  // Collect all sea edge keys
  epSeaEdges = new Set();
  edges.forEach((edge, key) => {
    if (edge.isSea) epSeaEdges.add(key);
  });

  // Build adjacency map: sea edge → list of neighbouring sea edges
  // Two sea edges are adjacent if they share exactly one endpoint vertex
  epEdgeAdjacency = new Map();
  epSeaEdges.forEach(key => epEdgeAdjacency.set(key, []));

  const seaEdgeList = [...edges.values()].filter(e => epSeaEdges.has(e.key));

  for (let i = 0; i < seaEdgeList.length; i++) {
    for (let j = i + 1; j < seaEdgeList.length; j++) {
      const a      = seaEdgeList[i];
      const b      = seaEdgeList[j];
      const aVerts = [`${a.ax},${a.ay}`, `${a.bx},${a.by}`];
      const bVerts = [`${b.ax},${b.by}`, `${b.bx},${b.by}`];
      const shared = aVerts.filter(v => bVerts.includes(v));
      if (shared.length === 1) {
        epEdgeAdjacency.get(a.key).push(b.key);
        epEdgeAdjacency.get(b.key).push(a.key);
      }
    }
  }
}

/**
 * epGetReachableEdges — BFS from a ship's current edge.
 * Returns Set of edge keys reachable within ship.movesLeft steps.
 * Excludes edges already holding 2 ships.
 */
function epGetReachableEdges(ship) {
  const reachable = new Set();
  const queue     = [{ key: ship.edgeKey, movesLeft: ship.movesLeft }];
  const visited   = new Set([ship.edgeKey]);

  while (queue.length > 0) {
    const { key, movesLeft } = queue.shift();
    if (movesLeft === 0) continue;

    const neighbours = epEdgeAdjacency.get(key) || [];
    for (const neighbourKey of neighbours) {
      if (visited.has(neighbourKey)) continue;
      visited.add(neighbourKey);

      // Check occupancy — cannot END on an edge with 2 ships
      const occupancy = epShips.filter(s => s.edgeKey === neighbourKey).length;
      if (occupancy < 2) reachable.add(neighbourKey);

      // Can still pass through a full edge (just can't stop there)
      queue.push({ key: neighbourKey, movesLeft: movesLeft - 1 });
    }
  }

  return reachable;
}

/**
 * epMoveShip — moves a ship to a new edge.
 * TODO: implement in Phase 4.
 */
function epMoveShip(ship, targetEdgeKey) {
  // Placeholder — Phase 4
}


/* ================================================================
   EP SECTION 4 · DISCOVERY (stubs — safe at top level)
   ================================================================ */

/**
 * epCheckDiscovery — checks if a ship reveals any tiles.
 * TODO: implement in Phase 5.
 */
function epCheckDiscovery(edgeKey) {
  // Placeholder — Phase 5
}

/**
 * epRevealTile — flips a face-down tile face-up and re-renders it.
 * TODO: implement in Phase 5.
 */
function epRevealTile(tile) {
  tile.discovered = true;
  // TODO: re-render tile, award 1 gold to activePlayer()
}


/* ================================================================
   EP SECTION 5 · BOARD INITIALISATION (called from epInit)
   Runs after catan.js initBoard() has built the SVG.
   ================================================================ */

function epInitBoard() {
  epBuildEdgeAdjacency();
  console.log(`[E&P] Sea edges: ${epSeaEdges.size}`);
  console.log(`[E&P] Adjacency entries: ${epEdgeAdjacency.size}`);

  // Remove port markers and lines — E&P has no classic ports
  document.querySelectorAll('.port-marker').forEach(el => el.remove());

  // TODO Phase 1: render face-down backs over undiscovered tiles
  // TODO Phase 6: place starting harbor settlements, settler ships, roads
}


/* ================================================================
   EP SECTION 6 · TURN STATE (safe at top level — just variables)
   ================================================================ */

let epHasRolled  = false;
let epInMovement = false;


/* ================================================================
   EP SECTION 7 · ENTRY POINT
   All catan.js hook overrides live HERE, inside epInit(), so they
   only exist when E&P mode is actually activated.
   Classic Catan is completely unaffected.
   ================================================================ */

function epInit() {
  activateExplorersMode();
  
  // Reposition axial origin so starting island at q=-5 fits on screen
  CX = 50;
  CY = 268;

  // Widen SVG viewport to fit the full three-zone E&P board
  document.getElementById('board-svg')
    .setAttribute('viewBox', '-400 -300 1200 1000');

  // ── Override 1: player model ──────────────────────────────────
  // E&P has no dev cards, no knights. Adds ships, settlers, gold.
  window.buildPlayerExtensions = function() {
    return {
      ships:    new Set(),
      settlers: 2,
      harbors:  new Set(),
      gold:     2,
    };
  };

  // ── Override 2: board generation ─────────────────────────────
  window.buildBoardOverride = function() {
    const tiles = [];

    // Starting island — terrains shuffled, tokens fixed per Example 2
    
    const startTerrains = shuffle([...EP_START_TERRAINS_POOL]);
    const startTokens   = shuffleNoAdjacentReds(EP_START_COORDS, startTerrains, [...EP_START_TOKENS]);
    EP_START_COORDS.forEach((coord, i) => {
      tiles.push({
        ...coord,
        terrain:    startTerrains[i],
        number:     startTokens[i],
        isOcean:    false,
        discovered: true,
      });
    });
    

    // Northern unexplored area — shuffled, face-down
    const northTerrains = shuffle([...EP_NORTH_TERRAINS]);
    const northTokens   = shuffleNoAdjacentReds(EP_NORTH_COORDS, northTerrains, [...EP_NORTH_TOKENS]);
        EP_NORTH_COORDS.forEach((coord, i) => {
      tiles.push({
        ...coord,
        terrain:    northTerrains[i],
        number:     northTokens[i],
        isOcean:    false,
        discovered: false,
      });
    });

    // Southern unexplored area — shuffled, face-down
    const southTerrains = shuffle([...EP_SOUTH_TERRAINS]);
    const southTokens   = shuffleNoAdjacentReds(EP_SOUTH_COORDS, southTerrains, [...EP_SOUTH_TOKENS]);
        EP_SOUTH_COORDS.forEach((coord, i) => {
      tiles.push({
        ...coord,
        terrain:    southTerrains[i],
        number:     southTokens[i],
        isOcean:    false,
        discovered: false,
      });
    });

    // Sea hexes — always face-up
    EP_SEA_COORDS.forEach(coord => {
      tiles.push({
        ...coord,
        terrain:    'ocean',
        number:     null,
        isOcean:    true,
        discovered: true,
      });
    });

    return tiles;
  };

  // ── Override 3: trade rates ───────────────────────────────────
  // E&P has no ports — all bank trades are 3:1
  window.getPortRateForResource = function(type) {
    return 3;
  };

  // ── Override 4: victory target ────────────────────────────────
  // Scenario 1 target is 8 VP. No shoe penalty in E&P.
  window.getVictoryTarget = function(player) {
    return GAME_CONFIG.vpToWin;
  };

  // ── Override 5: roll dice ─────────────────────────────────────
  // No robber on 7 in Scenario 1.
  // TODO Phase 7: gold compensation when player earns nothing.
  window.runRollDice = function() {
    document.getElementById('roll-dice-btn').style.display = 'none';
    epHasRolled = true;

    const d1   = Math.ceil(Math.random() * 6);
    const d2   = Math.ceil(Math.random() * 6);
    const roll = d1 + d2;

    document.getElementById('turn-label').textContent =
      `Turn ${currentTurn} · Rolled ${roll}`;

    if (roll !== 7) collectResources(roll);

    showRollOverlay(d1, d2, roll, () => {
      if (roll === 7) {
        // E&P: discard rule applies but no robber move after
        const mustDiscard = players.filter(p => totalResources(p) >= 8);
        if (mustDiscard.length > 0) {
          discardQueue = mustDiscard;
          // Override activateRobberMove temporarily so it does nothing
          const _original = activateRobberMove;
          window.activateRobberMove = function() {
            window.activateRobberMove = _original; // restore immediately
            document.getElementById('end-turn-btn').disabled   = false;
            document.getElementById('trade-open-btn').disabled = false;
          };
          processDiscardQueue();
        }
      }
      document.getElementById('end-turn-btn').style.display = 'inline-block';
      updateHudForPlayer(activePlayer());
    });
  };

  // ── Override 6: end turn ──────────────────────────────────────
  // TODO Phase 4: insert movement phase before advancing.
  window.runEndTurn = function() {
    epHasRolled  = false;
    epInMovement = false;

    // Reset ship movement points for active player
    epShips
      .filter(s => s.playerId === activePlayer().id)
      .forEach(s => { s.movesLeft = 4; });

    currentTurn++;
    nextPlayer();
    updateTurnLabel();
    document.getElementById('end-turn-btn').style.display  = 'none';
    document.getElementById('roll-dice-btn').style.display = 'inline-block';
  };

  // ── HUD cleanup ───────────────────────────────────────────────
  // Hide Classic-only buttons that don't exist in E&P
  document.getElementById('dev-buy-btn').style.display    = 'none';
  document.getElementById('dev-hand-btn').style.display   = 'none';
  document.getElementById('dev-deck-count').style.display = 'none';

  // ── Graph coord source ────────────────────────────────────────
  // Tell buildGraph which tiles to derive vertices and edges from.
  // Includes all E&P tiles — starting island, sea hexes, both
  // unexplored areas — so settlement spots and road/ship slots
  // are generated across the full board.
  window.buildGraphCoords = [
    ...EP_START_COORDS,
    ...EP_SEA_COORDS,
    ...EP_NORTH_COORDS,
    ...EP_SOUTH_COORDS,
  ];

  // ── Board init hook ───────────────────────────────────────────
  const _originalInitBoard = initBoard;
  window.initBoard = function() {
    _originalInitBoard();
    epInitBoard();
  };
}
