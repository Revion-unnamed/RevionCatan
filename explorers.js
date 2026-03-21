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
  { q:  0, r: -2 }, { q:  1, r: -2 },
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

// Number tokens — shuffled with no-adjacent-reds rule
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
 */
function epBuildEdgeAdjacency() {
  const allTiles = [
    ...EP_START_COORDS.map(c  => ({ ...c, isOcean: false })),
    ...EP_SEA_COORDS.map(c    => ({ ...c, isOcean: true  })),
    ...EP_NORTH_COORDS.map(c  => ({ ...c, isOcean: false })),
    ...EP_SOUTH_COORDS.map(c  => ({ ...c, isOcean: false })),
  ];

  const { edges } = buildGraph(window.buildGraphCoords, allTiles);

  epSeaEdges = new Set();
  edges.forEach((edge, key) => {
    if (edge.isSea) epSeaEdges.add(key);
  });

  epEdgeAdjacency = new Map();
  epSeaEdges.forEach(key => epEdgeAdjacency.set(key, []));

  const seaEdgeList = [...edges.values()].filter(e => epSeaEdges.has(e.key));

  for (let i = 0; i < seaEdgeList.length; i++) {
    for (let j = i + 1; j < seaEdgeList.length; j++) {
      const a      = seaEdgeList[i];
      const b      = seaEdgeList[j];
      const aVerts = [`${a.ax},${a.ay}`, `${a.bx},${a.by}`];
      const bVerts = [`${b.ax},${b.ay}`, `${b.bx},${b.by}`];
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
 * Stops expanding past edges that touch undiscovered tiles.
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

      const occupancy = epShips.filter(s => s.edgeKey === neighbourKey).length;
      if (occupancy < 2) reachable.add(neighbourKey);

      // Check if this edge touches an undiscovered tile — stop BFS here
      const line = document.querySelector(`line[data-key="${neighbourKey}"]`);
      let touchesUndiscovered = false;
      if (line) {
        const ax = parseFloat(line.getAttribute('x1'));
        const ay = parseFloat(line.getAttribute('y1'));
        const bx = parseFloat(line.getAttribute('x2'));
        const by = parseFloat(line.getAttribute('y2'));
        const endpointKeys = [
          `${roundCoord(ax)},${roundCoord(ay)}`,
          `${roundCoord(bx)},${roundCoord(by)}`,
        ];
        touchesUndiscovered = landTileCache.some(t => {
          if (t.discovered) return false;
          const { x, y } = hexToPixel(t.q, t.r);
          const corners  = hexCorners(x, y, HEX_SIZE);
          return corners.some(c =>
            endpointKeys.includes(`${roundCoord(c.x)},${roundCoord(c.y)}`)
          );
        });
      }

      if (!touchesUndiscovered) {
        queue.push({ key: neighbourKey, movesLeft: movesLeft - 1 });
      }
    }
  }

  return reachable;
}

/**
 * epGetDistance — BFS shortest path between two edge keys.
 */
function epGetDistance(fromKey, toKey) {
  if (fromKey === toKey) return 0;
  const queue   = [{ key: fromKey, dist: 0 }];
  const visited = new Set([fromKey]);

  while (queue.length > 0) {
    const { key, dist } = queue.shift();
    const neighbours = epEdgeAdjacency.get(key) || [];
    for (const nKey of neighbours) {
      if (nKey === toKey) return dist + 1;
      if (visited.has(nKey)) continue;
      visited.add(nKey);
      queue.push({ key: nKey, dist: dist + 1 });
    }
  }
  return Infinity;
}

/**
 * epMoveShip — moves a ship to a new edge, deducting movement points.
 */
function epMoveShip(ship, targetEdgeKey) {
  epClearHighlights();

  const dist = epGetDistance(ship.edgeKey, targetEdgeKey);
  activePlayer().ships.delete(ship.edgeKey);
  ship.edgeKey   = targetEdgeKey;
  ship.movesLeft = Math.max(0, ship.movesLeft - dist);
  activePlayer().ships.add(targetEdgeKey);

  epUpdateShipSVG(ship);
  epCheckDiscovery(targetEdgeKey, ship);

  if (ship.movesLeft > 0) {
    epSelectedShip = ship;
    const shipEl = document.querySelector(`[data-ship-id="${ship.id}"]`);
    if (shipEl) shipEl.classList.add('ship-selected');
    const reachable = epGetReachableEdges(ship);
    epHighlightEdges(reachable, activePlayer().color);
  } else {
    epSelectedShip = null;
    showMessage('⛵ Ship movement complete');
  }
}


/* ================================================================
   EP SECTION 3B · SHIP RENDERING
   ================================================================ */

/**
 * epRenderShip — draws a ship SVG element on an edge.
 */
function epRenderShip(ship) {
  const svg   = document.getElementById('board-svg');
  const layer = document.getElementById('ships-layer');
  if (!layer) return;

  const line = svg.querySelector(`line[data-key="${ship.edgeKey}"]`);
  if (!line) return;

  const ax = parseFloat(line.getAttribute('x1'));
  const ay = parseFloat(line.getAttribute('y1'));
  const bx = parseFloat(line.getAttribute('x2'));
  const by = parseFloat(line.getAttribute('y2'));

  const mx    = (ax + bx) / 2;
  const my    = (ay + by) / 2;
  const angle = Math.atan2(by - ay, bx - ax) * (180 / Math.PI);

  const player = players.find(p => p.id === ship.playerId);
  const color  = player ? player.color : '#ffffff';

  const body = svgEl('rect', {
    x: (-14).toFixed(2), y: (-5).toFixed(2),
    width: '28', height: '8', rx: '4',
    fill: color, stroke: '#2c1a0e', 'stroke-width': '1.5',
    'pointer-events': 'none',
  });

  const mast = svgEl('line', {
    x1: '0', y1: '-5', x2: '0', y2: '-13',
    stroke: '#2c1a0e', 'stroke-width': '1.5',
    'pointer-events': 'none',
  });

  const sail = svgEl('polygon', {
    points: '0,-13 8,-7 0,-5',
    fill: '#f5ead0', opacity: '0.85',
    'pointer-events': 'none',
  });

  const g = svgEl('g', {
    'data-ship-id':   ship.id,
    transform:        `translate(${mx.toFixed(2)},${my.toFixed(2)}) rotate(${angle.toFixed(1)})`,
    'pointer-events': 'all',
    cursor:           'pointer',
  });

  // Large invisible hit area for mobile tapping
  const hitRect = svgEl('rect', {
    x: '-20', y: '-20', width: '40', height: '40',
    fill: 'transparent', 'pointer-events': 'all',
  });

  g.appendChild(hitRect);
  g.appendChild(body);
  g.appendChild(mast);
  g.appendChild(sail);

  // Render hold contents
  if (ship.hold === 'settler') {
    const holdLabel = svgEl('text', {
      x: '0', y: '3',
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': '7', 'pointer-events': 'none',
      'data-settler-hold': 'true',
    });
    holdLabel.textContent = '👤';
    g.appendChild(holdLabel);
  }

  layer.appendChild(g);

  g.addEventListener('click', (e) => {
    e.stopPropagation();
    epOnShipClick(ship);
  });
}

function epRemoveShipSVG(ship) {
  document.querySelector(`[data-ship-id="${ship.id}"]`)?.remove();
}

function epUpdateShipSVG(ship) {
  epRemoveShipSVG(ship);
  epRenderShip(ship);
}

/**
 * epOnShipClick — handles ship taps in and out of movement phase.
 */
function epOnShipClick(ship) {
  // Outside movement phase — handle load/unload
  if (!epInMovement) {
    if (gamePhase !== 'play' || !hasRolledThisTurn) return;
    if (ship.playerId !== activePlayer().id) return;
    epShowShipActionMenu(ship);
    return;
  }

  // Only the selected ship can be clicked to deselect
  if (epSelectedShip) {
    if (epSelectedShip.id === ship.id) {
      epClearHighlights();
      epSelectedShip = null;
    }
    return;
  }

  if (ship.playerId !== activePlayer().id) return;

  epSelectedShip = ship;
  const shipEl = document.querySelector(`[data-ship-id="${ship.id}"]`);
  if (shipEl) shipEl.classList.add('ship-selected');

  if (ship.movesLeft === 0) {
    showMessage('⚠️ This ship has no moves left');
    epSelectedShip = null;
    if (shipEl) shipEl.classList.remove('ship-selected');
    return;
  }

  const reachable = epGetReachableEdges(ship);
  epHighlightEdges(reachable, activePlayer().color);
}

function epHighlightEdges(edgeKeys, color) {
  edgeKeys.forEach(key => {
    const line = document.querySelector(`line[data-key="${key}"]`);
    if (!line) return;
    line.classList.add('ep-reachable');
    line.style.stroke      = color;
    line.style.strokeWidth = '4';
    line.style.opacity     = '0.7';

    line._epMoveHandler = () => {
      if (!epSelectedShip) return;
      epMoveShip(epSelectedShip, key);
    };
    line.addEventListener('click', line._epMoveHandler);
  });
}

function epClearHighlights() {
  document.querySelectorAll('.ep-reachable').forEach(line => {
    line.classList.remove('ep-reachable');
    if (line.classList.contains('road')) return;
    line.style.stroke      = '';
    line.style.strokeWidth = '';
    line.style.opacity     = '';
    if (line._epMoveHandler) {
      line.removeEventListener('click', line._epMoveHandler);
      delete line._epMoveHandler;
    }
    const hitArea = line.previousElementSibling;
    if (hitArea && hitArea._epMoveHandler) {
      hitArea.removeEventListener('click', hitArea._epMoveHandler);
      delete hitArea._epMoveHandler;
    }
  });
  document.querySelectorAll('.ship-selected').forEach(el => {
    el.classList.remove('ship-selected');
  });
}

function epRenderAllShips() {
  epShips.forEach(s => epRenderShip(s));
}

/**
 * epRenderFaceDownTiles — draws grey overlays over undiscovered tiles.
 */
function epRenderFaceDownTiles() {
  const svg = document.getElementById('board-svg');

  let layer = document.getElementById('facedown-layer');
  if (!layer) {
    layer = svgEl('g', { id: 'facedown-layer' });
    const edgesLayer = document.getElementById('edges-layer');
    svg.insertBefore(layer, edgesLayer);
  }

  landTileCache.filter(t => !t.discovered).forEach(tile => {
    const { x, y } = hexToPixel(tile.q, tile.r);
    const corners  = hexCorners(x, y, HEX_SIZE);
    const pts      = cornersToPoints(corners);

    const overlay = svgEl('polygon', {
      points: pts, fill: '#2a2a3a', stroke: '#3a3a5a',
      'stroke-width': 2, 'pointer-events': 'none',
      'data-facedown': `${tile.q},${tile.r}`,
    });
    layer.appendChild(overlay);

    const label = svgEl('text', {
      x: x.toFixed(2), y: y.toFixed(2),
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': '18', fill: '#5a5a7a', 'pointer-events': 'none',
      'data-facedown-lbl': `${tile.q},${tile.r}`,
    });
    label.textContent = '?';
    layer.appendChild(label);
  });
}

/**
 * epPlaceShip — places a ship on an edge for the active player.
 */
function epPlaceShip(edgeKey, free = false) {
  if (!free) {
    if (!canAfford({ Lumber: 1, Wool: 1 })) {
      showMessage('⚠️ Need 🌲 + 🐑 to build a ship');
      return;
    }
    spendResources({ Lumber: 1, Wool: 1 });
  }

  const ship = {
    id:        `ship-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    edgeKey,
    playerId:  activePlayer().id,
    hold:      null,
    movesLeft: 0,
  };

  epShips.push(ship);
  activePlayer().ships.add(edgeKey);
  epRenderShip(ship);
  showMessage('⛵ Ship placed');
}


/* ================================================================
   EP SECTION 3C · SETTLERS
   ================================================================ */

/**
 * epBuildSettler — builds a settler piece on own settlement vertex.
 */
function epBuildSettler(vertexKey) {
  if (activePlayer().settlers >= 2) {
    showMessage('⚠️ Already have 2 settlers');
    return;
  }
  if (!activePlayer().villages.has(vertexKey) && !activePlayer().cities.has(vertexKey)) {
    showMessage('⚠️ Must build settler on own settlement');
    return;
  }
  if (!canAfford(VILLAGE_COST)) {
    showMessage('⚠️ Need 🌲 🧱 🐑 🌾 to build a settler');
    return;
  }
  if (activePlayer().settlerVertices?.has(vertexKey)) {
    showMessage('⚠️ Settler already here');
    return;
  }

  spendResources(VILLAGE_COST);
  activePlayer().settlers++;
  if (!activePlayer().settlerVertices) activePlayer().settlerVertices = new Set();
  activePlayer().settlerVertices.add(vertexKey);
  epRenderSettlerOnVertex(vertexKey);
  showMessage('👤 Settler built');
}

function epRenderSettlerOnVertex(vertexKey) {
  const svg    = document.getElementById('board-svg');
  const circle = svg.querySelector(`[data-key="${vertexKey}"]`);
  if (!circle) return;

  const vx = parseFloat(circle.getAttribute('cx'));
  const vy = parseFloat(circle.getAttribute('cy'));

  const label = svgEl('text', {
    x: vx.toFixed(2), y: (vy - 12).toFixed(2),
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-size': '10', 'pointer-events': 'none',
    'data-settler-vtx': vertexKey,
  });
  label.textContent = '👤';
  svg.appendChild(label);
}

function epRemoveSettlerFromVertex(vertexKey) {
  document.querySelector(`[data-settler-vtx="${vertexKey}"]`)?.remove();
}

function epRenderSettlerOnShip(ship) {
  const shipEl = document.querySelector(`[data-ship-id="${ship.id}"]`);
  if (!shipEl) return;
  if (shipEl.querySelector('[data-settler-hold]')) return;

  const label = svgEl('text', {
    x: '0', y: '3',
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-size': '7', 'pointer-events': 'none',
    'data-settler-hold': 'true',
  });
  label.textContent = '👤';
  shipEl.appendChild(label);
}

function epRemoveSettlerFromShip(ship) {
  document.querySelector(`[data-ship-id="${ship.id}"]`)
    ?.querySelector('[data-settler-hold]')?.remove();
}

function epLoadSettler(ship, vertexKey) {
  if (ship.hold !== null) {
    showMessage('⚠️ Ship hold is not empty');
    return;
  }
  ship.hold = 'settler';
  activePlayer().settlerVertices.delete(vertexKey);
  activePlayer().settlers--;
  epRemoveSettlerFromVertex(vertexKey);
  epRenderSettlerOnShip(ship);
  showMessage('👤 Settler loaded');
}

/**
 * epUnloadSettler — places settler from ship hold as a free settlement.
 * Uses freePlacement flag so placeVillage doesn't charge again.
 */
function epUnloadSettler(ship, v) {
  if (ship.hold !== 'settler') {
    showMessage('⚠️ No settler in hold');
    return;
  }
  ship.hold = null;
  epRemoveSettlerFromShip(ship);
  epUpdateShipSVG(ship);
  freePlacement = true;
  placeVillage(v);
  freePlacement = false;
}

function epGetAdjacentVertices(ship) {
  const [aKey, bKey] = ship.edgeKey.split('|');
  return [aKey, bKey];
}

function epGetShipsAdjacentToVertex(vertexKey) {
  return epShips.filter(s => {
    const [aKey, bKey] = s.edgeKey.split('|');
    return aKey === vertexKey || bKey === vertexKey;
  });
}

/**
 * epShowShipActionMenu — shows load/unload prompt when ship tapped outside movement.
 */
function epShowShipActionMenu(ship) {
  document.getElementById('place-prompt')?.remove();

  const { x: sx, y: sy } = svgToScreen(
    parseFloat(document.querySelector(`line[data-key="${ship.edgeKey}"]`)?.getAttribute('x1') || 0),
    parseFloat(document.querySelector(`line[data-key="${ship.edgeKey}"]`)?.getAttribute('y1') || 0)
  );

  const adjVerts = epGetAdjacentVertices(ship);

  const hasSettlerOnAdj = adjVerts.some(vk =>
    activePlayer().settlerVertices?.has(vk)
  );
  const canLoad   = ship.hold === null && hasSettlerOnAdj;
  // canUnload: ship has settler — valid vertex check happens in epActivateSettlerUnload
  const canUnload = ship.hold === 'settler';

  if (!canLoad && !canUnload) return;

  let html = '';
  if (canLoad)   html += `<button id="ship-load">👤 Load Settler</button>`;
  if (canUnload) html += `<button id="ship-unload">🏠 Place Settlement</button>`;
  html += `<button id="cancel-prompt">✕</button>`;

  const prompt = document.createElement('div');
  prompt.id = 'place-prompt';
  prompt.innerHTML = html;
  document.body.appendChild(prompt);

  const pw   = 200;
  const left = Math.min(sx + 10, window.innerWidth - pw - 8);
  const top  = Math.max(sy - 36, 60);
  prompt.style.left        = `${left}px`;
  prompt.style.top         = `${top}px`;
  prompt.style.borderColor = activePlayer().color;
  prompt.querySelectorAll('button').forEach(b => {
    b.style.borderColor = activePlayer().color;
    b.style.color       = activePlayer().color;
  });

  document.getElementById('ship-load')?.addEventListener('click', () => {
    prompt.remove();
    const settlerVtx = adjVerts.find(vk => activePlayer().settlerVertices?.has(vk));
    if (settlerVtx) epLoadSettler(ship, settlerVtx);
  });

  document.getElementById('ship-unload')?.addEventListener('click', () => {
    prompt.remove();
    epActivateSettlerUnload(ship);
  });

  document.getElementById('cancel-prompt')?.addEventListener('click', () => {
    prompt.remove();
  });
}

/**
 * epHandleVertexClick — routes E&P vertex clicks.
 * Shows settlement or settler build options.
 */
function epHandleVertexClick(v) {
  const hasVillage   = activePlayer().villages.has(v.key);
  const hasCity      = players.some(p => p.cities.has(v.key));
  const takenByOther = players.some(p => p.id !== activePlayer().id &&
    (p.villages.has(v.key) || p.cities.has(v.key)));

  if (hasCity || takenByOther) return;

// Vertex must touch at least one land tile
  const touchesLand = landTileCache.some(t => {
    const { x, y } = hexToPixel(t.q, t.r);
    const corners  = hexCorners(x, y, HEX_SIZE);
    return corners.some(c =>
      `${roundCoord(c.x)},${roundCoord(c.y)}` === v.key
    );
  });
  const canSettle  = !hasVillage && touchesLand && isVertexAvailable(v);
  const canSettler = hasVillage &&
                     canAfford(VILLAGE_COST) &&
                     activePlayer().settlers < 2 &&
                     !activePlayer().settlerVertices?.has(v.key);

  if (!canSettle && !canSettler) return;

  document.getElementById('place-prompt')?.remove();

  const { x: screenX, y: screenY } = svgToScreen(v.x, v.y);
  const pw   = 200;
  const left = Math.min(screenX + 10, window.innerWidth - pw - 8);
  const top  = Math.max(screenY - 36, 60);

  let html = '';
  if (canSettle)  html += `<button id="confirm-village">🏠 Settlement</button>`;
  if (canSettler) html += `<button id="confirm-settler">👤 Build Settler</button>`;
  html += `<button id="cancel-prompt">✕</button>`;

  const prompt = document.createElement('div');
  prompt.id = 'place-prompt';
  prompt.innerHTML = html;
  document.body.appendChild(prompt);
  prompt.style.left        = `${left}px`;
  prompt.style.top         = `${top}px`;
  prompt.style.borderColor = activePlayer().color;
  prompt.querySelectorAll('button').forEach(b => {
    b.style.borderColor = activePlayer().color;
    b.style.color       = activePlayer().color;
  });

  document.getElementById('confirm-village')?.addEventListener('click', () => {
    placeVillage(v);
    prompt.remove();
  });

  document.getElementById('confirm-settler')?.addEventListener('click', () => {
    epBuildSettler(v.key);
    prompt.remove();
  });

  document.getElementById('cancel-prompt')?.addEventListener('click', () => {
    prompt.remove();
  });
}

/**
 * epActivateSettlerUnload — highlights valid adjacent vertices for settler placement.
 * Shows message and returns early if no valid vertex exists.
 */
 function epActivateSettlerUnload(ship) {
  const adjVerts = epGetAdjacentVertices(ship);

  // Check if any valid vertex exists first
  const hasValid = adjVerts.some(vertexKey => {
    const circle = document.querySelector(`[data-key="${vertexKey}"]`);
    if (!circle) return false;
    const _phase = gamePhase;
    gamePhase = 'setup2';
    const ok = isVertexAvailable({
      key: vertexKey,
      x:   parseFloat(circle.getAttribute('cx')),
      y:   parseFloat(circle.getAttribute('cy')),
    });
    gamePhase = _phase;
    return ok;
  });

  if (!hasValid) {
    showMessage('⚠️ No valid vertex to place settlement here');
    return;
  }

  showMessage('🏠 Tap a vertex to place settlement');

  adjVerts.forEach(vertexKey => {
    const circle = document.querySelector(`[data-key="${vertexKey}"]`);
    if (!circle) return;

    const v = {
      key: vertexKey,
      x:   parseFloat(circle.getAttribute('cx')),
      y:   parseFloat(circle.getAttribute('cy')),
    };

    const _phase = gamePhase;
    gamePhase = 'setup2';
    const available = isVertexAvailable(v);
    gamePhase = _phase;
    if (!available) return;

    circle.classList.add('ep-settler-target');
    circle.style.fill    = activePlayer().color;
    circle.style.opacity = '0.6';

    const handler = (e) => {
      if (e) e.stopPropagation();
      document.querySelectorAll('.ep-settler-target').forEach(el => {
        el.classList.remove('ep-settler-target');
        el.style.opacity = '';
        if (!el.classList.contains('settlement') && !el.classList.contains('city')) {
          el.style.fill = '';
        }
        if (el._epSettlerHandler) {
          el.removeEventListener('click', el._epSettlerHandler);
          delete el._epSettlerHandler;
        }
      });
      epUnloadSettler(ship, v);
    };

    circle._epSettlerHandler = handler;
    circle.addEventListener('click', handler);
    circle.addEventListener('touchend', (e) => { e.preventDefault(); handler(); });
  });
}

/* ================================================================
   EP SECTION 4 · DISCOVERY
   ================================================================ */

/**
 * epCheckDiscovery — checks if moving to an edge reveals any tiles.
 * Sets ship.movesLeft = 0 on discovery.
 */
function epCheckDiscovery(edgeKey, ship = null) {
  const line = document.querySelector(`line[data-key="${edgeKey}"]`);
  if (!line) return;

  const ax = parseFloat(line.getAttribute('x1'));
  const ay = parseFloat(line.getAttribute('y1'));
  const bx = parseFloat(line.getAttribute('x2'));
  const by = parseFloat(line.getAttribute('y2'));

  const endpointKeys = [
    `${roundCoord(ax)},${roundCoord(ay)}`,
    `${roundCoord(bx)},${roundCoord(by)}`,
  ];

  landTileCache.filter(t => !t.discovered).forEach(tile => {
    const { x, y } = hexToPixel(tile.q, tile.r);
    const corners  = hexCorners(x, y, HEX_SIZE);

    const touches = corners.some(c =>
      endpointKeys.includes(`${roundCoord(c.x)},${roundCoord(c.y)}`)
    );

    if (touches) {
      epRevealTile(tile);
      if (ship) ship.movesLeft = 0;
    }
  });
}

/**
 * epRevealTile — removes face-down overlay and awards discovery resource.
 */
function epRevealTile(tile) {
  tile.discovered = true;

  document.querySelector(`[data-facedown="${tile.q},${tile.r}"]`)?.remove();
  document.querySelector(`[data-facedown-lbl="${tile.q},${tile.r}"]`)?.remove();

  const info = TERRAIN[tile.terrain];
  if (info && info.resource) {
    addResourceForPlayer(activePlayer(), info.resource, 1);
    showMessage(`🗺️ Discovered ${info.label}! +1 ${info.icon}`, 3000);
  } else {
    showMessage('🗺️ New land discovered!', 3000);
  }
}


/* ================================================================
   EP SECTION 5 · BOARD INITIALISATION
   ================================================================ */

function epInitBoard() {
  epBuildEdgeAdjacency();

  // Append ships layer after vertices so it sits on top and receives clicks
  const svg = document.getElementById('board-svg');
  if (!document.getElementById('ships-layer')) {
    svg.appendChild(svgEl('g', { id: 'ships-layer' }));
  }

  // Remove stray text elements above ships-layer (port label remnants)
  [...svg.children].forEach(el => {
    if (el.tagName === 'text') el.remove();
  });

  console.log(`[E&P] Sea edges: ${epSeaEdges.size}`);
  console.log(`[E&P] Adjacency entries: ${epEdgeAdjacency.size}`);

  document.querySelectorAll('.port-marker').forEach(el => el.remove());
  epRenderFaceDownTiles();
  epRenderAllShips();
}


/* ================================================================
   EP SECTION 6 · TURN STATE
   ================================================================ */

var epHasRolled    = false;
var epInMovement   = false;
var epSelectedShip = null;
var epSettlerMode  = null;


/* ================================================================
   EP SECTION 7 · ENTRY POINT
   ================================================================ */

function epInit() {
  activateExplorersMode();

  CX = 50;
  CY = 268;

  document.getElementById('board-svg')
    .setAttribute('viewBox', '-400 -300 1200 1000');

  // ── Override 1: player model ──────────────────────────────────
  window.buildPlayerExtensions = function() {
    return {
      ships:           new Set(),
      settlers:        0,
      settlerVertices: new Set(),
      harbors:         new Set(),
      gold:            0,
    };
  };

  // ── Override 2: board generation ─────────────────────────────
  window.buildBoardOverride = function() {
    const tiles = [];

    const startTerrains = shuffle([...EP_START_TERRAINS_POOL]);
    const startTokens   = shuffleNoAdjacentReds(EP_START_COORDS, startTerrains, [...EP_START_TOKENS]);
    EP_START_COORDS.forEach((coord, i) => {
      tiles.push({ ...coord, terrain: startTerrains[i], number: startTokens[i], isOcean: false, discovered: true });
    });

    const northTerrains = shuffle([...EP_NORTH_TERRAINS]);
    const northTokens   = shuffleNoAdjacentReds(EP_NORTH_COORDS, northTerrains, [...EP_NORTH_TOKENS]);
    EP_NORTH_COORDS.forEach((coord, i) => {
      tiles.push({ ...coord, terrain: northTerrains[i], number: northTokens[i], isOcean: false, discovered: false });
    });

    const southTerrains = shuffle([...EP_SOUTH_TERRAINS]);
    const southTokens   = shuffleNoAdjacentReds(EP_SOUTH_COORDS, southTerrains, [...EP_SOUTH_TOKENS]);
    EP_SOUTH_COORDS.forEach((coord, i) => {
      tiles.push({ ...coord, terrain: southTerrains[i], number: southTokens[i], isOcean: false, discovered: false });
    });

    EP_SEA_COORDS.forEach(coord => {
      tiles.push({ ...coord, terrain: 'ocean', number: null, isOcean: true, discovered: true });
    });

    return tiles;
  };

  // ── Override 3: trade rates ───────────────────────────────────
  window.getPortRateForResource = function(type) { return 3; };

  // ── Override 4: victory target ────────────────────────────────
  window.getVictoryTarget = function(player) { return GAME_CONFIG.vpToWin; };

  // ── Override 5: roll dice ─────────────────────────────────────
  window.runRollDice = function() {
    document.getElementById('roll-dice-btn').style.display = 'none';
    epHasRolled       = true;
    hasRolledThisTurn = true;

    const d1   = Math.ceil(Math.random() * 6);
    const d2   = Math.ceil(Math.random() * 6);
    const roll = d1 + d2;

    document.getElementById('turn-label').textContent = `Turn ${currentTurn} · Rolled ${roll}`;

    if (roll !== 7) collectResources(roll);

    showRollOverlay(d1, d2, roll, () => {
      if (roll === 7) {
        const mustDiscard = players.filter(p => totalResources(p) >= 8);
        if (mustDiscard.length > 0) {
          discardQueue = mustDiscard;
          const _original = activateRobberMove;
          window.activateRobberMove = function() {
            window.activateRobberMove = _original;
            document.getElementById('end-turn-btn').disabled   = false;
            document.getElementById('trade-open-btn').disabled = false;
          };
          processDiscardQueue();
        }
      }
      document.getElementById('move-ships-btn').style.display = 'inline-block';
      document.getElementById('end-turn-btn').style.display   = 'inline-block';
      updateHudForPlayer(activePlayer());
    });
  };

  // ── Override 6: end turn ──────────────────────────────────────
  window.runEndTurn = function() {
    epInMovement   = false;
    epClearHighlights();
    epSelectedShip = null;
    epHasRolled    = false;

    currentTurn++;
    nextPlayer();

    epShips
      .filter(s => s.playerId === activePlayer().id)
      .forEach(s => { s.movesLeft = 4; });

    updateTurnLabel();
    document.getElementById('move-ships-btn').style.display = 'none';
    document.getElementById('move-ships-btn').textContent   = '⛵ Move';
    document.getElementById('end-turn-btn').style.display   = 'none';
    document.getElementById('roll-dice-btn').style.display  = 'inline-block';
  };

  // ── Move Ships button ─────────────────────────────────────────
  document.getElementById('move-ships-btn').addEventListener('click', () => {
    if (epInMovement) {
      epInMovement   = false;
      epClearHighlights();
      epSelectedShip = null;
      document.getElementById('move-ships-btn').textContent = '⛵ Move';
      showMessage('Movement phase ended');
    } else {
      epInMovement = true;
      document.getElementById('move-ships-btn').textContent = '✓ Done Moving';
      showMessage('⛵ Tap a ship to move it');
    }
  });

  // ── HUD cleanup ───────────────────────────────────────────────
  document.getElementById('dev-buy-btn').style.display    = 'none';
  document.getElementById('dev-hand-btn').style.display   = 'none';
  document.getElementById('dev-deck-count').style.display = 'none';

  // ── Graph coord source ────────────────────────────────────────
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
