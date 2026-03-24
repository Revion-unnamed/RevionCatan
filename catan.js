
/* ================================================================
   catan.js — Settlers of Catan · Mobile Edition
   ================================================================ */


/* ================================================================
   SECTION 1 · CONSTANTS & CONFIG
   ================================================================ */

const GAME_CONFIG = {
  mode:         'classic',   // 'classic' | 'citiesknights' | 'explorers'
  vpToWin:      10,
  boardSize:    'standard',
  seafarers:    false,
  extraIslands: 0,
  fishermen:    false,
};

// Hex geometry: flat-top orientation.
// HEX_SIZE is the circumradius — distance from centre to any corner.
const HEX_SIZE = 46;

// Centre of the SVG viewport (must match the viewBox in index.html).
let CX = 200;
let CY = 200;

const ROAD_COST    = { Lumber: 1, Brick: 1 };
const VILLAGE_COST = { Lumber: 1, Brick: 1, Wool: 1, Grain: 1 };
const CITY_COST    = { Grain: 2, Ore: 3 };


// Player definitions — add or remove players here
const PLAYER_CONFIGS = [
  { name: 'Player 1', color: '#c0392b' },
  { name: 'Player 2', color: '#2980b9' },
  { name: 'Player 3', color: '#27ae60' },
  { name: 'Player 4', color: '#f39c12' },
];


/* ================================================================
   SECTION 2 · TERRAIN DEFINITIONS
   Maps each terrain key to its CSS class, emoji icon, and resource.
   null resource = no card produced (desert / ocean).
   ================================================================ */

const TERRAIN = {
  forest:    { cls: 'terrain-forest',    icon: '🌲', label: 'Forest',    resource: 'Lumber' },
  pasture:   { cls: 'terrain-pasture',   icon: '🐑', label: 'Pasture',   resource: 'Wool'   },
  fields:    { cls: 'terrain-fields',    icon: '🌾', label: 'Fields',    resource: 'Grain'  },
  hills:     { cls: 'terrain-hills',     icon: '🧱', label: 'Hills',     resource: 'Brick'  },
  mountains: { cls: 'terrain-mountains', icon: '⛰️',  label: 'Mountains', resource: 'Ore'    },
  desert:    { cls: 'terrain-desert',    icon: '🏜️',  label: 'Desert',    resource: null     },
  lake: { cls: 'terrain-lake', icon: '🏞️', label: 'Lake', resource: null },
  gold:      { cls: 'terrain-gold',      icon: '🪙',  label: 'Gold',      resource: 'Gold'   },
  ocean:     { cls: 'terrain-ocean',     icon: null,  label: 'Ocean',     resource: null     },
};


/* ================================================================
   SECTION 3 · BOARD DATA — TERRAIN & TOKEN POOLS
   ================================================================ */

// Standard Catan land tile distribution (19 tiles total):
//   4 × Forest, 4 × Pasture, 4 × Fields, 3 × Hills, 3 × Mountains, 1 × Desert
const LAND_TERRAINS = [
  'forest',    'forest',    'forest',    'forest',
  'pasture',   'pasture',   'pasture',   'pasture',
  'fields',    'fields',    'fields',    'fields',
  'hills',     'hills',     'hills',
  'mountains', 'mountains', 'mountains',
  'desert',
];

// Standard number token pool (18 tokens — one per non-desert land tile):
//   2–12 excluding 7, weighted by classic Catan distribution.
const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];


/* ================================================================
   SECTION 4 · BOARD COORDINATES (axial q, r system)
   ================================================================ */

// 19 land tile positions in the classic 3-4-5-4-3 row pattern.
// Axial coordinate system: q = column, r = row (offset).
const LAND_COORDS = [
  // Row 0 — top (3 tiles)
  { q:  0, r: -2 }, { q:  1, r: -2 }, { q:  2, r: -2 },
  // Row 1 (4 tiles)
  { q: -1, r: -1 }, { q:  0, r: -1 }, { q:  1, r: -1 }, { q:  2, r: -1 },
  // Row 2 — middle (5 tiles)
  { q: -2, r:  0 }, { q: -1, r:  0 }, { q:  0, r:  0 }, { q:  1, r:  0 }, { q:  2, r:  0 },
  // Row 3 (4 tiles)
  { q: -2, r:  1 }, { q: -1, r:  1 }, { q:  0, r:  1 }, { q:  1, r:  1 },
  // Row 4 — bottom (3 tiles)
  { q: -2, r:  2 }, { q: -1, r:  2 }, { q:  0, r:  2 },
];

// 18 ocean ring tile positions surrounding the land area.
const OCEAN_COORDS = [
  { q:  0, r: -3 },
  { q:  1, r: -3 },
  { q:  2, r: -3 },
  { q:  3, r: -3 },
  { q:  3, r: -2 },
  { q:  3, r: -1 },
  { q:  3, r:  0 },
  { q:  2, r:  1 },
  { q:  1, r:  2 },
  { q:  0, r:  3 },
  { q: -1, r:  3 },
  { q: -2, r:  3 },
  { q: -3, r:  3 },
  { q: -3, r:  2 },
  { q: -3, r:  1 },
  { q: -3, r:  0 },
  { q: -2, r: -1 },
  { q: -1, r: -2 },
];


/* ================================================================
   SECTION 5 · UTILITIES
   ================================================================ */

/**
 * shuffle — Fisher-Yates in-place array shuffle.
 * Returns the same array (mutated) for convenience.
 * @param {Array} arr
 * @returns {Array}
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * hexToPixel — converts axial (q, r) coordinates to SVG pixel (x, y).
 *
 * Flat-top hex formulas:
 *   x = HEX_SIZE × (√3 × q  +  √3/2 × r)
 *   y = HEX_SIZE × (3/2 × r)
 *
 * @param {number} q
 * @param {number} r
 * @returns {{ x: number, y: number }}
 */
function hexToPixel(q, r) {
  const x = CX + HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = CY + HEX_SIZE * (3 / 2) * r;
  return { x, y };
}

/**
 * hexCorners — returns the 6 corner points of a flat-top hex.
 * Flat-top: corner 0 is at angle 0° (right), then every 60° clockwise.
 *
 * @param {number} cx   — centre x
 * @param {number} cy   — centre y
 * @param {number} size — circumradius
 * @returns {Array<{ x: number, y: number }>}
 */
function hexCorners(cx, cy, size) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (60 * i + 30);
    corners.push({
      x: cx + size * Math.cos(angleRad),
      y: cy + size * Math.sin(angleRad),
    });
  }
  return corners;
}

/**
 * cornersToPoints — joins corner objects into an SVG points string.
 * e.g. "123.00,45.00 ..."
 *
 * @param {Array<{ x: number, y: number }>} corners
 * @returns {string}
 */
function cornersToPoints(corners) {
  return corners.map(c => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
}

/**
 * svgEl — creates a namespaced SVG element and sets its attributes.
 *
 * @param {string} tag   — SVG tag name (e.g. 'polygon', 'text')
 * @param {Object} attrs — key/value attribute map
 * @returns {SVGElement}
 */
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

/**
 * getPips — returns the pip (dot) count for a number token.
 * Formula: pips = 6 − |7 − n|
 * Results: 2→1, 3→2, 4→3, 5→4, 6→5, 8→5, 9→4, 10→3, 11→2, 12→1
 *
 * @param {number} n — the number printed on the token (2–12, not 7)
 * @returns {number}
 */
function getPips(n) {
  return 6 - Math.abs(7 - n);
}

/**
 * roundCoord — rounds a pixel coordinate to 1 decimal place.
 * Used to generate stable string keys for deduplication —
 * floating-point math can produce tiny differences for shared corners.
 *
 * @param {number} n
 * @returns {number}
 */
function roundCoord(n) {
  return parseFloat(n.toFixed(1));
}

// Unicode die faces ⚀–⚅ are codepoints 9856–9861
function dieFace(n) {
  return String.fromCodePoint(9855 + n);
}
/**
 * svgToScreen — converts an SVG internal coordinate to a screen pixel position,
 * accounting for the current zoom/pan transform on #board-wrap.
 */
function svgToScreen(svgX, svgY) {
  const svg  = document.getElementById('board-svg');
  const rect = svg.getBoundingClientRect();
  const vb   = svg.viewBox.baseVal;

  // SVG coordinate → fraction of viewBox → pixel within SVG element
  // Then apply the board-wrap zoom transform
  const svgPixelX = ((svgX - vb.x) / vb.width)  * (rect.width  / zoomScale);
  const svgPixelY = ((svgY - vb.y) / vb.height) * (rect.height / zoomScale);

  // Apply zoom and translate to get final screen position
  const screenX = svgPixelX * zoomScale + zoomTranslateX + rect.left;
  const screenY = svgPixelY * zoomScale + zoomTranslateY + rect.top;

  return { x: screenX, y: screenY };
}
// Zoom state — module scope so prompt positioning can read it
let zoomScale      = 1;
let zoomTranslateX = 0;
let zoomTranslateY = 0;

function initZoom() {
  let lastDist   = null;
  let dragStartX = null;
  let dragStartY = null;


  const wrap = document.getElementById('board-wrap');

function applyTransform() {
    wrap.style.transform = `translate(${zoomTranslateX}px, ${zoomTranslateY}px) scale(${zoomScale})`;
  }

  wrap.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    dragStartX = e.touches[0].clientX - zoomTranslateX;
    dragStartY = e.touches[0].clientY - zoomTranslateY;
  });

  wrap.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && dragStartX !== null) {
      zoomTranslateX = e.touches[0].clientX - dragStartX;
      zoomTranslateY = e.touches[0].clientY - dragStartY;
      applyTransform();
    }
    if (e.touches.length === 2) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastDist !== null) {
        zoomScale = Math.min(Math.max(zoomScale * dist / lastDist, 0.5), 3);
        applyTransform();
      }
      lastDist = dist;
    }
  }, { passive: false });

  wrap.addEventListener('touchend', (e) => {
    if (e.touches.length < 2)  lastDist   = null;
    if (e.touches.length === 0) dragStartX = null;
  });
}


/* ================================================================
   SECTION 6 · BOARD MODEL
   ================================================================ */

// Axial neighbour directions (6 directions for flat-top hex grid)
const HEX_DIRS = [
  { q:  1, r:  0 }, { q: -1, r:  0 },
  { q:  0, r:  1 }, { q:  0, r: -1 },
  { q:  1, r: -1 }, { q: -1, r:  1 },
];

/**
 * shuffleNoAdjacentReds — shuffles tokens ensuring 6 and 8 are never
 * placed on neighbouring tiles. Retries until a valid layout is found.
 * @param {Array} coords   — LAND_COORDS array
 * @param {Array} terrains — shuffled terrain array
 * @param {Array} tokens   — number token pool
 * @returns {Array} validly ordered tokens
 */
function shuffleNoAdjacentReds(coords, terrains, tokens) {
  const RED = new Set([6, 8]);
  let attempt;

  do {
    attempt = shuffle(tokens);

    // Desert slots get null; assign tokens in order to non-desert slots
    let tIdx = 0;
    const assigned = coords.map((_, i) => {
      return terrains[i] === 'desert' ? null : attempt[tIdx++];
    });

    // Check: no two RED-valued neighbours
    let valid = true;
    outer: for (let i = 0; i < coords.length; i++) {
      if (!RED.has(assigned[i])) continue;
      for (const d of HEX_DIRS) {
        const nq = coords[i].q + d.q;
        const nr = coords[i].r + d.r;
        const j  = coords.findIndex(c => c.q === nq && c.r === nr);
        if (j !== -1 && RED.has(assigned[j])) { valid = false; break outer; }
      }
    }
    if (valid) return attempt;
  } while (true);
}

/**
 * buildBoard — shuffles terrains and tokens, then returns a flat array
 * of tile objects ready for rendering.
 *
 * Each tile object shape:
 *   { q, r, terrain, number, isOcean }
 *
 * @returns {Array<Object>}
 */
function buildBoard() {
  // Shuffle copies so originals stay intact (allows future resets)
  const terrains = shuffle([...LAND_TERRAINS]);
  if (GAME_CONFIG.fishermen) {
  const desertIdx = terrains.indexOf('desert');
  if (desertIdx !== -1) terrains[desertIdx] = 'lake';
}
  const tokens   = shuffleNoAdjacentReds(LAND_COORDS, terrains, [...NUMBER_TOKENS]);

  let tokenIdx = 0;
  const tiles  = [];

  // --- Land tiles ---
  LAND_COORDS.forEach((coord, i) => {
    const terrain = terrains[i];
    if (GAME_CONFIG.fishermen && terrain === 'desert') terrain = 'lake';
    // Desert never receives a number token
    const number  = (terrain === 'desert'  || terrain === 'lake') ? null : tokens[tokenIdx++];
    tiles.push({ ...coord, terrain, number, isOcean: false });
  });

  // --- Ocean ring tiles ---
  OCEAN_COORDS.forEach(coord => {
    tiles.push({ ...coord, terrain: 'ocean', number: null, isOcean: true });
  });

  return tiles;
}


/* ================================================================
   SECTION 7 · RENDER — TILES
   ================================================================ */

/**
 * renderDots — draws small pip circles beneath a number token.
 * Dots are centred horizontally under the token number text.
 *
 * @param {SVGElement} g      — parent group element
 * @param {number}     cx     — horizontal centre
 * @param {number}     cy     — vertical position of dots
 * @param {number}     count  — number of dots to draw (1–5)
 * @param {boolean}    isRed  — use red colour for 6 & 8
 */
function renderDots(g, cx, cy, count, isRed) {
  const dotRadius  = 1.5;
  const spacing    = 4.5;
  const totalWidth = (count - 1) * spacing;
  const startX     = cx - totalWidth / 2;

  for (let i = 0; i < count; i++) {
    const dot = svgEl('circle', {
      cx:    (startX + i * spacing).toFixed(2),
      cy:    cy.toFixed(2),
      r:     dotRadius,
      class: `token-dots${isRed ? '' : ' normal'}`,
    });
    g.appendChild(dot);
  }
}

/**
 * renderTile — builds and appends one SVG group for a single tile.
 * Draws: hex polygon → inner highlight → terrain icon → number token.
 *
 * @param {SVGElement} svg  — the root SVG element
 * @param {Object}     tile — tile data object from buildBoard()
 */
function renderTile(svg, tile) {
  const { x, y } = hexToPixel(tile.q, tile.r);
  const corners   = hexCorners(x, y, HEX_SIZE);
  const pts       = cornersToPoints(corners);
  const info      = TERRAIN[tile.terrain];

  // Wrapper group — carries axial coords as data attributes for later use
  const g = svgEl('g', {
    class:    'hex-group',
    'data-q': tile.q,
    'data-r': tile.r,
  });

  // --- Hex polygon (main tile shape) ---
  const poly = svgEl('polygon', {
    points: pts,
    class:  `hex-tile ${info.cls}`,
  });
  g.appendChild(poly);

  // --- Inner highlight polygon (subtle bevel effect) ---
  const innerCorners = hexCorners(x, y, HEX_SIZE - 4);
  const shadow = svgEl('polygon', {
    points: cornersToPoints(innerCorners),
    class:  'hex-shadow',
  });
  g.appendChild(shadow);

  // Ocean tiles stop here — no icons or tokens
  if (tile.isOcean) {
    svg.appendChild(g);
    return;
  }
  
  if (tile.terrain === 'lake') {
  // Shift icon up to make room for tokens below
  const lakeIcon = svgEl('text', {
    x:     x.toFixed(2),
    y:     (y - 12).toFixed(2),
    class: 'terrain-icon',
  });
  lakeIcon.textContent = '🏞️';
  g.appendChild(lakeIcon);

  // Four small tokens: 2, 3, 11, 12
  const lakeNums = [2, 3, 11, 12];
  const tokenR   = 8;
  const spacing  = 20;
  const startX   = x - (spacing * 1.5);

  lakeNums.forEach((n, i) => {
    const tx  = startX + i * spacing;
    const ty  = y + 12;

    const circle = svgEl('circle', {
      cx:    tx.toFixed(2),
      cy:    ty.toFixed(2),
      r:     tokenR,
      class: 'token-circle',
    });
    g.appendChild(circle);

    const numText = svgEl('text', {
      x:           tx.toFixed(2),
      y:           (ty - 1).toFixed(2),
      class:       'token-number normal',
      'font-size': '7',
    });
    numText.textContent = n;
    g.appendChild(numText);

    renderDots(g, tx, ty + 6, getPips(n), false);
  });

  svg.appendChild(g);
  return;
}
    

  // --- Terrain icon (emoji) ---
  if (info.icon) {
    // Shift icon up when a token is present to avoid overlap
    const iconY = y - (tile.number !== null ? 12 : 0);
    const icon  = svgEl('text', {
      x:     x.toFixed(2),
      y:     iconY.toFixed(2),
      class: 'terrain-icon',
    });
    icon.textContent = info.icon;
    g.appendChild(icon);
  }

  // --- Number token (circle + number + pip dots) ---
  if (tile.number !== null) {
    const isRed  = tile.number === 6 || tile.number === 8;
    const tokenR = 14;      // token circle radius in SVG units
    const ty     = y + 14;  // token vertical position (below icon)

    // Background circle
    const circle = svgEl('circle', {
      cx:    x.toFixed(2),
      cy:    ty.toFixed(2),
      r:     tokenR,
      class: `token-circle${isRed ? ' red' : ''}`,
    });
    g.appendChild(circle);

    // Number text
    const numText = svgEl('text', {
      x:           x.toFixed(2),
      y:           (ty - 1).toFixed(2),
      class:       `token-number${isRed ? ' red' : ' normal'}`,
      'font-size': '13',
    });
    numText.textContent = tile.number;
    g.appendChild(numText);

    // Probability pip dots
    renderDots(g, x, ty + 9, getPips(tile.number), isRed);
  }

  svg.appendChild(g);
}


/* ================================================================
   SECTION 8 · GRAPH GEOMETRY
   ================================================================ */

/**
 * buildGraph — derives the complete set of unique vertices and edges
 * from the land tile coordinates.
 *
 * A vertex is a hex corner point. Because adjacent tiles share corners,
 * we deduplicate by a rounded "x,y" string key.
 *
 * An edge connects two adjacent vertices (one side of a hex).
 * We deduplicate by sorting both vertex keys and joining them.
 *
 * Returns:
 *   vertices — Map<string, { x, y, key }>            (54 entries)
 *   edges    — Map<string, { ax, ay, bx, by, key }>  (72 entries)
 *
 * @returns {{ vertices: Map, edges: Map }}
 */

  function buildGraph(coordSource = LAND_COORDS, allTiles = []) {
  const vertices = new Map(); // key → { x, y, key }
  const edges    = new Map(); // key → { ax, ay, bx, by, key, isSea }

  // Build tile lookup for isSea classification
  const tileMap = new Map();
  allTiles.forEach(t => tileMap.set(`${t.q},${t.r}`, t));

  for (const coord of coordSource) {
    const { x, y } = hexToPixel(coord.q, coord.r);
    const corners  = hexCorners(x, y, HEX_SIZE);

    // Round each corner for stable key generation
    const rounded = corners.map(c => ({
      x: roundCoord(c.x),
      y: roundCoord(c.y),
    }));

    // Register each corner as a unique vertex
    rounded.forEach(c => {
      const key = `${c.x},${c.y}`;
      if (!vertices.has(key)) {
        vertices.set(key, { x: c.x, y: c.y, key });
      }
    });

    // Register each hex side as a unique edge
    for (let i = 0; i < 6; i++) {
      const a = rounded[i];
      const b = rounded[(i + 1) % 6];

      const keyA = `${a.x},${a.y}`;
      const keyB = `${b.x},${b.y}`;

      // Canonical edge key: sort vertex keys so A–B and B–A map to same entry
      const edgeKey = [keyA, keyB].sort().join('|');

if (!edges.has(edgeKey)) {
        const thisTile = tileMap.get(`${coord.q},${coord.r}`);
        const isOcean  = thisTile ? thisTile.isOcean : false;
        edges.set(edgeKey, {
          ax: a.x, ay: a.y,
          bx: b.x, by: b.y,
          key: edgeKey,
          isSea:    isOcean,
          seaCount: isOcean ? 1 : 0,
        });
      } else {
        const thisTile = tileMap.get(`${coord.q},${coord.r}`);
        if (thisTile && thisTile.isOcean) {
          edges.get(edgeKey).isSea = true;
          edges.get(edgeKey).seaCount = (edges.get(edgeKey).seaCount || 0) + 1;
        }
      }
 
      
    }
  }

  return { vertices, edges };
}


/* ================================================================
   SECTION 9 · RENDER — EDGES & VERTICES
   ================================================================ */

/**
 * renderEdges — draws all 72 road edges as SVG lines.
 * Edges are rendered BELOW vertices so vertices sit on top.
 * Each line carries a data-key attribute for future interaction.
 *
 * @param {SVGElement} svg
 * @param {Map}        edges — from buildGraph()
 */
function renderEdges(svg, edges) {
  // Wrapper group keeps edges organised in the SVG tree
  const g = svgEl('g', { id: 'edges-layer' });

  for (const edge of edges.values()) {
    // Wide invisible hit area for easier touch targeting
    const hitArea = svgEl('line', {
      x1:               edge.ax.toFixed(2),
      y1:               edge.ay.toFixed(2),
      x2:               edge.bx.toFixed(2),
      y2:               edge.by.toFixed(2),
      stroke:           'transparent',
      'stroke-width':   18,
      'stroke-linecap': 'round',
    });
    g.appendChild(hitArea);
    hitArea.addEventListener('click', () => onEdgeClick(edge));

    const line = svgEl('line', {
      x1:         edge.ax.toFixed(2),
      y1:         edge.ay.toFixed(2),
      x2:         edge.bx.toFixed(2),
      y2:         edge.by.toFixed(2),
      class:      'edge',
      'data-key': edge.key,
    });
    g.appendChild(line);
    line.addEventListener('click', () => onEdgeClick(edge));
  }

  svg.appendChild(g);
}

/**
 * renderVertices — draws all 54 settlement vertices as SVG circles.
 * Each circle carries a data-key attribute for future interaction.
 *
 * @param {SVGElement} svg
 * @param {Map}        vertices — from buildGraph()
 */
function renderVertices(svg, vertices) {
  // Wrapper group keeps vertices organised in the SVG tree
  const g = svgEl('g', { id: 'vertices-layer' });

  for (const v of vertices.values()) {
    const circle = svgEl('circle', {
      cx:         v.x.toFixed(2),
      cy:         v.y.toFixed(2),
      r:          5,
      class:      'vertex',
      'data-key': v.key,
    });
    g.appendChild(circle);
    circle.addEventListener('click', () => onVertexClick(v));
  }

  svg.appendChild(g);
}


/* ================================================================
   SECTION 10 · PORTS
   ================================================================ */

/**
 * buildPorts and buildfisheries— assigns 9 ports to evenly spaced ocean tiles.
 * Alternates strictly 2:1 / 3:1 around the ring.
 * Which ocean tile is slot 0 is random.
 *
 * Port shape: { type, rate, oceanCoord, vertices[] }
 */
function buildPorts() {
  // 5 resource-specific 2:1 ports — shuffled
  const twoPorts = shuffle(['lumber', 'wool', 'grain', 'brick', 'ore']);

  // 9 port slots alternating 2:1 and 3:1
  // slots 0,2,4,6,8 = 2:1 resource ports
  // slots 1,3,5,7   = 3:1 generic ports
  let twoIdx = 0;
  const portTypes = [];

  // Only randomise between even and odd pattern — guarantees 1 gap between every port
  const startOffset = Math.floor(Math.random() * 2);
  const portCoords  = [];

  // Always place 5 × 2:1 and 4 × 3:1 regardless of startOffset.
  // Interleave them: 2:1 at positions 0,2,4,6,8.
  for (let i = 0; i < 9; i++) {
    if (i % 2 === 0) {
      portTypes.push({ type: twoPorts[twoIdx++], rate: 2 });
    } else {
      portTypes.push({ type: 'any', rate: 3 });
    }
  }

  // Rotate the type array by startOffset so tile and type alignment
  // stays in sync without changing the 5/4 split
  if (startOffset === 1) {
    portTypes.unshift(portTypes.pop());
  }

  // Pick 9 evenly spaced ocean tiles from the 18 available
  for (let i = 0; i < 9; i++) {
    const idx = (startOffset + i * 2) % OCEAN_COORDS.length;
    portCoords.push(OCEAN_COORDS[idx]);
  }

  // Build the graph once to get vertex positions
  const { vertices } = buildGraph();

  // For each port ocean tile, find the 2 vertices it shares with land
  ports = portCoords.map((oceanCoord, i) => {
    const { x, y } = hexToPixel(oceanCoord.q, oceanCoord.r);
    const corners  = hexCorners(x, y, HEX_SIZE);

    // Get all corners with their index preserved
    const sharedCorners = corners
      .map((c, i) => ({ key: `${roundCoord(c.x)},${roundCoord(c.y)}`, i, x: c.x, y: c.y }))
      .filter(c => vertices.has(c.key));

    // Find all adjacent pairs (consecutive corner indices)
    const adjPairs = [];
    for (let a = 0; a < sharedCorners.length; a++) {
      for (let b = a + 1; b < sharedCorners.length; b++) {
        const diff = Math.abs(sharedCorners[a].i - sharedCorners[b].i);
        if (diff === 1 || diff === 5) {
          adjPairs.push([sharedCorners[a], sharedCorners[b]]);
        }
      }
    }

    // Pick the adjacent pair whose midpoint is closest to board centre.
    // This selects the face pointing inward toward the land.
    let bestPair = adjPairs[0];
    if (adjPairs.length > 1) {
      let closest = Infinity;
      for (const pair of adjPairs) {
        const mx   = (pair[0].x + pair[1].x) / 2;
        const my   = (pair[0].y + pair[1].y) / 2;
        const dist = Math.sqrt((mx - CX) ** 2 + (my - CY) ** 2);
        if (dist < closest) {
          closest  = dist;
          bestPair = pair;
        }
      }
    }

    return {
      ...portTypes[i],
      oceanCoord,
      vertices: bestPair ? [bestPair[0].key, bestPair[1].key] : [],
    };
  });
}


/**
 * renderPorts  and fisheries— draws port indicators on ocean tiles and
 * mouth markers on the two land-facing vertices.
 */
function renderPorts() {
  const svg = document.getElementById('board-svg');

  const portIcons = {
    lumber: '🌲', wool: '🐑', grain: '🌾',
    brick: '🧱', ore: '⛰️', any: '✦',
  };

  ports.forEach(port => {
    const { x, y } = hexToPixel(port.oceanCoord.q, port.oceanCoord.r);

    // --- Rate label (2:1 or 3:1) ---
    const label = svgEl('text', {
      x:                   x.toFixed(2),
      y:                   (y - 6).toFixed(2),
      'text-anchor':       'middle',
      'dominant-baseline': 'central',
      'font-size':         '9',
      fill:                '#f5ead0',
      'pointer-events':    'none',
    });
    label.textContent = `${port.rate}:1`;
    svg.appendChild(label);

    // --- Port icon ---
    const icon = svgEl('text', {
      x:                   x.toFixed(2),
      y:                   (y + 7).toFixed(2),
      'text-anchor':       'middle',
      'dominant-baseline': 'central',
      'font-size':         '12',
      'pointer-events':    'none',
    });
    icon.textContent = portIcons[port.type];
    svg.appendChild(icon);

    // --- Mouth markers on land vertices ---
    port.vertices.forEach(key => {
      const [vx, vy] = key.split(',').map(Number);

      const ring = svgEl('circle', {
        cx:               vx.toFixed(2),
        cy:               vy.toFixed(2),
        r:                7,
        fill:             'none',
        stroke:           '#bdc3c7',
        'stroke-width':   2,
        'pointer-events': 'none',
        class:            'port-marker',
      });
      svg.appendChild(ring);
    });

    // --- Dotted line from ocean tile centre to each mouth vertex ---
    port.vertices.forEach(key => {
      const [vx, vy] = key.split(',').map(Number);

      const line = svgEl('line', {
        x1:                 x.toFixed(2),
        y1:                 y.toFixed(2),
        x2:                 vx.toFixed(2),
        y2:                 vy.toFixed(2),
        stroke:             port.rate === 2 ? '#f39c12' : '#bdc3c7',
        'stroke-width':     1.5,
        'stroke-dasharray': '3,3',
        opacity:            '0.6',
        'pointer-events':   'none',
      });
      svg.appendChild(line);
    });
  });
}



/* ================================================================
   SECTION 11 · PLAYER MODEL
   ================================================================ */

/**
 * buildPlayerExtensions — returns mode-specific extra fields for a player object.
 * Expansion files override this function to inject their own fields.
 * @returns {Object}
 */
function buildPlayerExtensions() {
  const base = {};
  if (GAME_CONFIG.mode === 'classic') {
    base.devCards    = [];
    base.newDevCards = new Set();
    base.knightCount = 0;
  }
  return base;
}

// Player state objects — one per player
const players = PLAYER_CONFIGS.map((config, i) => ({
  id:             i,
  name:           config.name,
  color:          config.color,
  resources:      { Lumber: 0, Brick: 0, Wool: 0, Grain: 0, Ore: 0 },
  villagesPlaced: 0,
  citiesPlaced:   0,
  roads:          new Set(),
  villages:       new Set(),
  cities:         new Set(),
  victoryPoints:  0,
  fish:           [],
    hasShoe:        false,
}));

/**
 * applyPlayerExtensions — merges mode-specific fields into all player objects.
 * Called from initBoard() after mode is confirmed, not at declaration time.
 */
function applyPlayerExtensions() {
  const extensions = buildPlayerExtensions();
  players.forEach(p => Object.assign(p, { ...extensions }));
}

// Bank starts with 19 of each resource — finite like physical Catan
const bank = { Lumber: 19, Brick: 19, Wool: 19, Grain: 19, Ore: 19 };

/**
 * RESOURCE_CONFIG — drives the resource HUD and addResourceForPlayer.
 * Expansion files replace this array to add/change resource types.
 * Each entry: { type, id, icon }
 *   type — key used in player.resources and bank
 *   id   — DOM element id in the resource HUD
 *   icon — emoji shown in messages and overlays
 */
const RESOURCE_CONFIG = [
  { type: 'Lumber', id: 'res-lumber', icon: '🌲' },
  { type: 'Brick',  id: 'res-brick',  icon: '🧱' },
  { type: 'Wool',   id: 'res-wool',   icon: '🐑' },
  { type: 'Grain',  id: 'res-grain',  icon: '🌾' },
  { type: 'Ore',    id: 'res-ore',    icon: '⛰️' },
];

// Convenience reference to the active player — updated each turn
let currentPlayerIndex = 0;
function activePlayer() { return players[currentPlayerIndex]; }


/* ================================================================
   SECTION 12 · GAME PHASE & SETUP
   ================================================================ */

// 'setup1' = first round, 'setup2' = reverse round, 'play' = normal game
let gamePhase = 'setup1';

// Tracks what each player still needs to place this setup turn
// 'village' = must place village first, 'road' = must place road next
let setupAction = 'village';

// Setup order: [0,1,2,3,3,2,1,0] for 4 players — built at game start
let setupOrder = [];
let setupIndex = 0;

let currentTurn = 1;
let hasRolledThisTurn = false;
let freePlacement     = false; // set true to bypass resource cost in placeVillage

function buildSetupOrder() {
  const forward  = players.map(p => p.id);
  const backward = [...forward].reverse();
  setupOrder = [...forward, ...backward];
}

function currentSetupPlayer() {
  return players[setupOrder[setupIndex]];
}

function advanceSetup() {
  setupIndex++;
  // Switch to setup2 when we cross the halfway point
  if (setupIndex === players.length) {
    gamePhase = 'setup2';
  }
  if (setupIndex >= setupOrder.length) {
    // All setup turns done — begin normal play
    gamePhase          = 'play';
    if (GAME_CONFIG.fishermen) {
  document.getElementById('fish-market-btn').style.display = 'inline-block';
    updateFishBtn();
}
    currentPlayerIndex = 0;
    updateHudForPlayer(activePlayer());
    updateTurnLabel();

    // Show Roll button so first player rolls to start
    showMessage(`Setup complete! ${activePlayer().name} goes first`);
    document.getElementById('roll-dice-btn').style.display = 'inline-block';
    document.getElementById('end-turn-btn').style.display  = 'none';
    return;
  }
  setupAction = 'village';
  const player = currentSetupPlayer();
  currentPlayerIndex = player.id;
  updateHudForPlayer(player);
  updateTurnLabel();
}


function updateTurnLabel() {
  const label = document.getElementById('turn-label');
  if (gamePhase === 'play') {
    label.textContent = `Turn ${currentTurn}`;
    return;
  }
  const round  = gamePhase === 'setup1' ? 'Setup 1' : 'Setup 2';
  const action = setupAction === 'village' ? 'Place Village' : 'Place Road';
  label.textContent = `${round} · ${action}`;
}

function nextPlayer() {
  devCardPlayedThisTurn = false;

  // Cards bought last turn are now playable
  // Cards bought last turn are now playable — Classic only
  if (GAME_CONFIG.mode === 'classic') {
    activePlayer().newDevCards.clear();
  }
  
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  updateHudForPlayer(activePlayer());
}

/**
 * runEndTurn — advances to next player and shows the Roll Dice button.
 * Expansion files can override this to add end-of-turn logic.
 */
function runEndTurn() {
  hasRolledThisTurn = false;
  currentTurn++;
  nextPlayer();
  updateTurnLabel();
  document.getElementById('end-turn-btn').style.display  = 'none';
  document.getElementById('roll-dice-btn').style.display = 'inline-block';
}

/**
 * runRollDice — rolls dice, collects resources, shows overlay.
 * Expansion files can override this to add extra dice or phases.
 */
function runRollDice() {
  document.getElementById('roll-dice-btn').style.display = 'none';
  hasRolledThisTurn = true;

  const d1   = Math.ceil(Math.random() * 6);
  const d2   = Math.ceil(Math.random() * 6);
  const roll = d1 + d2;

  document.getElementById('turn-label').textContent = `Turn ${currentTurn} · Rolled ${roll}`;

  // Collect before overlay so earnings list is accurate
  if (roll !== 7) collectResources(roll);
  collectFish(roll);

  showRollOverlay(d1, d2, roll, () => {
    if (roll === 7 && GAME_CONFIG.mode === 'classic') handleRobber();
    document.getElementById('end-turn-btn').style.display = 'inline-block';
    updateHudForPlayer(activePlayer());
  });
}

/**
 * showRollOverlay — displays dice faces, total, and per-player earnings.
 * Calls onDismiss after 2s or on tap — whichever comes first.
 * Expansion files can override this to show additional roll info.
 */
function showRollOverlay(d1, d2, roll, onDismiss) {
  const overlay = document.getElementById('roll-overlay');

  // Dice faces in the small HUD bar
  document.getElementById('die-1').textContent = dieFace(d1);
  document.getElementById('die-2').textContent = dieFace(d2);

  // Big overlay dice
  document.getElementById('roll-die-1').textContent = dieFace(d1);
  document.getElementById('roll-die-2').textContent = dieFace(d2);

  // Total line
  document.getElementById('roll-total').textContent =
    roll === 7 ? `${roll} — Robber! 🥷` : `rolled ${roll}`;

  // Who earns what — build list from land tiles
  let lines = [];
  if (roll !== 7) {
    for (const tile of landTileCache) {
      if (tile.number !== roll) continue;
      if (robberTile && robberTile.q === tile.q && robberTile.r === tile.r) continue;
      const info = TERRAIN[tile.terrain];
      if (!info.resource) continue;
      const { x, y } = hexToPixel(tile.q, tile.r);
      const corners  = hexCorners(x, y, HEX_SIZE);
      for (const player of players) {
        let amt = 0;
        corners.forEach(c => {
          const key = `${roundCoord(c.x)},${roundCoord(c.y)}`;
          if (player.villages.has(key)) amt += 1;
          if (player.cities.has(key))   amt += 2;
        });
        if (amt > 0) {
          const entry = RESOURCE_CONFIG.find(r => r.type === info.resource);
          const icon  = entry ? entry.icon : '';
          lines.push(`${icon.repeat(amt)} ${player.name}`);
        }
      }
    }
  }

  // Fish earners
  if (GAME_CONFIG.fishermen && roll !== 7) {
    const fishTiles = [
      ...fisheryTiles.filter(t => t.number === roll),
      ...([2, 3, 11, 12].includes(roll) ? landTileCache.filter(t => t.terrain === 'lake') : []),
    ];
    for (const tile of fishTiles) {
      if (robberTile && robberTile.q === tile.q && robberTile.r === tile.r) continue;
      const { x, y } = hexToPixel(tile.q, tile.r);
      const corners  = hexCorners(x, y, HEX_SIZE);
      for (const player of players) {
        let amt = 0;
        corners.forEach(c => {
          const key = `${roundCoord(c.x)},${roundCoord(c.y)}`;
          if (player.villages.has(key)) amt += 1;
          if (player.cities.has(key))   amt += 2;
        });
        if (amt > 0) lines.push(`🐟`.repeat(amt) + ` ${player.name}`);
      }
    }
  }

  document.getElementById('roll-earners').textContent =
    lines.length ? lines.join('  ·  ') : (roll === 7 ? '' : 'No one collects');

  overlay.classList.add('visible');

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    overlay.classList.remove('visible');
    overlay.removeEventListener('click', dismiss);
    onDismiss();
  }

  const timer = setTimeout(dismiss, 2000);
  overlay.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
}


/* ================================================================
   SECTION 13 · PLACEMENT RULES
   ================================================================ */

/**
 * isVertexAvailable — returns false if any directly connected
 * neighbour vertex already has a settlement (distance rule).
 */
function isVertexAvailable(v) {
  // Check all players for occupancy and distance rule
  for (const player of players) {
    if (player.villages.has(v.key)) return false;
    if (player.cities.has(v.key))   return false;
  }

  const { edges } = buildGraph();
  for (const edge of edges.values()) {
    const touchesV = (edge.ax === v.x && edge.ay === v.y) ||
                     (edge.bx === v.x && edge.by === v.y);
    if (!touchesV) continue;

    const nx   = (edge.ax === v.x && edge.ay === v.y) ? edge.bx : edge.ax;
    const ny   = (edge.ax === v.x && edge.ay === v.y) ? edge.by : edge.ay;
    const nKey = `${roundCoord(nx)},${roundCoord(ny)}`;

    for (const player of players) {
      if (player.villages.has(nKey) || player.cities.has(nKey)) return false;
    }
  }

  if (gamePhase !== 'play') return true;

  for (const edge of edges.values()) {
    if (!activePlayer().roads.has(edge.key)) continue;
    const aKey = `${edge.ax},${edge.ay}`;
    const bKey = `${edge.bx},${edge.by}`;
    if (aKey === v.key || bKey === v.key) return true;
  }

  return false;
}

/**
 * isEdgeAvailable — edge must touch a vertex with a village,
 * or connect to another edge that already has a road.
 */
function isEdgeAvailable(edge) {
  // Block if any player already has a road here
  for (const player of players) {
    if (player.roads.has(edge.key)) return false;
  }

  const endpointKeys = [
    `${edge.ax},${edge.ay}`,
    `${edge.bx},${edge.by}`,
  ];

  if (gamePhase !== 'play') {
    // Setup: road must connect to the village just placed this turn
    const lastVillage = [...activePlayer().villages].at(-1);
    if (!lastVillage) return false;
    return endpointKeys.includes(lastVillage);
  }

  for (const key of endpointKeys) {
    if (activePlayer().villages.has(key) || activePlayer().cities.has(key)) return true;
  }

  const { edges } = buildGraph();
  for (const other of edges.values()) {
    if (!activePlayer().roads.has(other.key)) continue;
    const otherKeys = [`${other.ax},${other.ay}`, `${other.bx},${other.by}`];
    for (const ek of endpointKeys) {
      if (otherKeys.includes(ek)) return true;
    }
  }

  return false;
}

function onVertexClick(v) {
  if (gamePhase === 'play' && !hasRolledThisTurn) return;
  if (gamePhase !== 'play' && setupAction !== 'village') return;
  if (gamePhase !== 'play' && currentSetupPlayer().id !== activePlayer().id) return;
  // In E&P, vertex click also allows building a settler
  if (GAME_CONFIG.mode === 'explorers' && gamePhase === 'play') {
    epHandleVertexClick(v);
    return;
  }
  // E&P setup routing
  if (GAME_CONFIG.mode === 'explorers' && gamePhase !== 'play') {
    if (epSetupRound === 1) { epHandleSetup1Harbor(v); return; }
    if (epSetupRound === 2) { epHandleSetup2Village(v); return; }
    return; // setup3 vertex clicks not handled here
  }

  const available    = isVertexAvailable(v);
  const hasVillage   = activePlayer().villages.has(v.key);
  const hasCity      = players.some(p => p.cities.has(v.key));
  const takenByOther = players.some(p => p.id !== activePlayer().id &&
    (p.villages.has(v.key) || p.cities.has(v.key)));

  if (hasCity)                  return;
  if (takenByOther)             return;
  if (!available && !hasVillage) return;

  document.getElementById('place-prompt')?.remove();

const { x: screenX, y: screenY } = svgToScreen(v.x, v.y);


  const prompt = document.createElement('div');
  prompt.id = 'place-prompt';
  prompt.innerHTML = hasVillage
    ? `<button id="confirm-city">🏙️ Upgrade City</button><button id="cancel-prompt">✕</button>`
    : `<button id="confirm-village">🏠 Place Village</button><button id="cancel-prompt">✕</button>`;

document.body.appendChild(prompt);
  // Clamp so prompt never goes off screen
  const pw = 160; // estimated prompt width
  const left = Math.min(screenX + 10, window.innerWidth - pw - 8);
  const top  = Math.max(screenY - 36, 60);
  prompt.style.left = `${left}px`;
  prompt.style.top  = `${top}px`;
  
  prompt.querySelectorAll('button').forEach(b => {
  b.style.borderColor = activePlayer().color;
  b.style.color       = activePlayer().color;
});
  
  document.getElementById('confirm-city')?.addEventListener('click', () => {
    placeCity(v);
    prompt.remove();
  });
  document.getElementById('confirm-village')?.addEventListener('click', () => {
    placeVillage(v);
    prompt.remove();
  });
  document.getElementById('cancel-prompt').addEventListener('click', () => prompt.remove());
}

function onEdgeClick(edge) {
  if (gamePhase === 'play' && !hasRolledThisTurn) return;
  if (typeof epInMovement !== 'undefined' && epInMovement) return;
  if (gamePhase !== 'play' && setupAction !== 'road' && setupAction !== 'ship') return;
  if (GAME_CONFIG.mode === 'explorers' && gamePhase !== 'play' && epSetupRound === 3) {
    if (setupAction === 'road') {
      // Normal road placement — after placing, switch to ship
      if (!isEdgeAvailable(edge)) return;
      placeRoad(edge);
      setupAction        = 'ship';
      epSetupShipPending = true;
      updateTurnLabel();
      epActivateSetup3Ship();
      return;
    }
    return; // ship placement handled by epActivateSetup3Ship highlights
  }
  
  if (gamePhase !== 'play' && currentSetupPlayer().id !== activePlayer().id) return;

const canRoad = edge.seaCount !== 2 &&
                  isEdgeAvailable(edge) &&
                  (gamePhase !== 'play' || canAfford(ROAD_COST));

const canShip = GAME_CONFIG.mode === 'explorers' &&
                  edge.isSea &&
                  canAfford({ Lumber: 1, Wool: 1 }) &&
                  (() => {
                    const [aKey, bKey] = edge.key.split('|');

                    // Edge must touch own harbor settlement
                    const touchesHarbor = typeof epIsHarborVertex === 'function' &&
                                          (epIsHarborVertex(aKey) || epIsHarborVertex(bKey));
                    if (!touchesHarbor) return false;

                    // Edge must not border undiscovered tile
                    const bordersUndiscovered = landTileCache.some(t => {
                      if (t.discovered) return false;
                      const { x, y } = hexToPixel(t.q, t.r);
                      const corners  = hexCorners(x, y, HEX_SIZE);
                      const keys     = corners.map(c =>
                        `${roundCoord(c.x)},${roundCoord(c.y)}`
                      );
                      return keys.includes(aKey) && keys.includes(bKey);
                    });
                    return !bordersUndiscovered;
                  })();


  // Nothing possible — silent return
  if (!canRoad && !canShip) return;

  document.getElementById('place-prompt')?.remove();

  const svg    = document.getElementById('board-svg');
  const rect   = svg.getBoundingClientRect();
  const vb     = svg.viewBox.baseVal;
  const scaleX = rect.width  / vb.width;
  const scaleY = rect.height / vb.height;
  const mx     = rect.left + ((edge.ax + edge.bx) / 2 - vb.x) * scaleX;
  const my     = rect.top  + ((edge.ay + edge.by) / 2 - vb.y) * scaleY;

  let buttonsHtml = '';
  if (canRoad) buttonsHtml += `<button id="confirm-road">🛤️ Place Road</button>`;
  if (canShip) buttonsHtml += `<button id="confirm-ship">⛵ Build Ship</button>`;
  buttonsHtml += `<button id="cancel-village">✕</button>`;

  const prompt = document.createElement('div');
  prompt.id = 'place-prompt';
  prompt.innerHTML = buttonsHtml;
  document.body.appendChild(prompt);

  const pw   = canRoad && canShip ? 280 : 160;
  const left = Math.min(mx + 10, window.innerWidth - pw - 8);
  const top  = Math.max(my - 36, 60);
  prompt.style.left        = `${left}px`;
  prompt.style.top         = `${top}px`;
  prompt.style.borderColor = activePlayer().color;
  prompt.querySelectorAll('button').forEach(b => {
    b.style.borderColor = activePlayer().color;
    b.style.color       = activePlayer().color;
  });

  document.getElementById('confirm-road')?.addEventListener('click', () => {
    placeRoad(edge);
    prompt.remove();
  });

  document.getElementById('confirm-ship')?.addEventListener('click', () => {
    prompt.remove();
    if (typeof epPlaceShip === 'function') epPlaceShip(edge.key, false);
  });

  document.getElementById('cancel-village').addEventListener('click', () => {
    prompt.remove();
  });
}

function placeVillage(v) {
  if (activePlayer().villagesPlaced >= 5) {
    showMessage('⚠️ No settlements remaining');
    return;
  }
  // Only charge during play phase
  if (gamePhase === 'play' && !freePlacement && !canAfford(VILLAGE_COST)) {
    showMessage('⚠️ Not enough resources — needs 🌲 🐑 🧱 🌾');
    return;
  }
  if (gamePhase === 'play' && !freePlacement) spendResources(VILLAGE_COST);
 
  // Find the vertex circle and upgrade it
  const circle = document.querySelector(`[data-key="${v.key}"]`);
  if (!circle) return;
  circle.classList.add('settlement');
  circle.setAttribute('r', 7);

  const svg   = document.getElementById('board-svg');
  const house = svgEl('text', {
    x:                v.x.toFixed(2),
    y:                (v.y + 1).toFixed(2),
    class:            'village-icon',
    'pointer-events': 'none',
  });
  house.textContent = '🏠';
  svg.appendChild(house);

  circle.style.fill   = activePlayer().color;
  circle.style.stroke = '#2c1a0e';
  circle.removeEventListener('click', onVertexClick); // can't place twice
  activePlayer().villages.add(v.key);

  activePlayer().villagesPlaced++;
  updateVP(activePlayer(), 1);
  updateLongestRoad('true');
  updateTradePanel();

  if (gamePhase !== 'play') {
    setupAction = 'road';
    updateTurnLabel();

    if (gamePhase === 'setup2') {
      for (const tile of landTileCache) {
        if (!tile.number) continue;
        const info = TERRAIN[tile.terrain];
        if (!info.resource) continue;

        // Check if village vertex touches this tile's corners
        const { x, y } = hexToPixel(tile.q, tile.r);
        const corners  = hexCorners(x, y, HEX_SIZE);
        const touches  = corners.some(c =>
          `${roundCoord(c.x)},${roundCoord(c.y)}` === v.key
        );
        if (touches) addResourceForPlayer(activePlayer(), info.resource, 1);
        if (touches && GAME_CONFIG.fishermen) {
  // Check fishery tiles too
  for (const ft of fisheryTiles) {
    const { x: fx, y: fy } = hexToPixel(ft.q, ft.r);
    const fc = hexCorners(fx, fy, HEX_SIZE);
    const ftTouches = fc.some(c =>
      `${roundCoord(c.x)},${roundCoord(c.y)}` === v.key
    );
    if (ftTouches) drawFishToken(activePlayer(), 1);
  }
}
      }
      if (GAME_CONFIG.fishermen) {
  const lake = landTileCache.find(t => t.terrain === 'lake');
  if (lake) {
    const { x, y } = hexToPixel(lake.q, lake.r);
    const corners  = hexCorners(x, y, HEX_SIZE);
    const touches  = corners.some(c =>
      `${roundCoord(c.x)},${roundCoord(c.y)}` === v.key
    );
    if (touches) drawFishToken(activePlayer(), 1);
  }
}
    }
  }
}

function placeCity(v) {
  if (activePlayer().citiesPlaced >= 4) {
    showMessage('⚠️ No cities remaining');
    return;
  }
  if (!canAfford(CITY_COST)) {
    showMessage('⚠️ Not enough resources — needs 🌾🌾 ⛰️⛰️⛰️');
    return;
  }
  spendResources(CITY_COST);

  const circle = document.querySelector(`[data-key="${v.key}"]`);
  if (!circle) return;

  circle.classList.remove('settlement');
  circle.classList.add('city');
  circle.setAttribute('r', 9);
  circle.style.fill   = activePlayer().color;
  circle.style.stroke = '#2c1a0e';

  document.querySelectorAll('.village-icon').forEach(el => {
    if (el.getAttribute('x') === v.x.toFixed(2) &&
        el.getAttribute('y') === (v.y + 1).toFixed(2)) {
      el.textContent = '🏙️';
    }
  });

  activePlayer().citiesPlaced++;
  updateVP(activePlayer(), 1); // city = 2VP total, village was already 1VP
  activePlayer().cities.add(v.key);
  activePlayer().villages.delete(v.key);
  // City replaces a settlement — return it to supply
  activePlayer().villagesPlaced--;
}

function placeRoad(edge) {
  if (activePlayer().roads.size >= 15) {
    showMessage('⚠️ No roads remaining');
    return;
  }

  if (gamePhase === 'play' && freeRoads > 0) {
    // Road Building card — free road
    freeRoads--;
    showMessage(freeRoads > 0 ? '🛤️ Place 1 more free road' : '🛤️ Road Building done');
  } else {
    if (gamePhase === 'play' && !canAfford(ROAD_COST)) {
      showMessage('⚠️ Not enough resources — needs 🌲 🧱');
      return;
    }
    if (gamePhase === 'play') spendResources(ROAD_COST);
  }

  activePlayer().roads.add(edge.key);
  const line = document.querySelector(`line[data-key="${edge.key}"]`);
  if (!line) return;
  line.classList.add('road');
  line.style.stroke = activePlayer().color;

if (gamePhase !== 'play' && !(GAME_CONFIG.mode === 'explorers' && epSetupRound === 3)) {
    advanceSetup();
  }
  updateLongestRoad();
}

/**
 * calcLongestRoad — depth-first search through a player's roads.
 * Finds the longest chain of connected road segments.
 * @param {Object} player
 * @returns {number} length of longest road
 */
function calcLongestRoad(player) {
  // Build adjacency map: vertexKey → [edgeKey, neighbourVertexKey]
  const adj = new Map();

  for (const edgeKey of player.roads) {
    const [aKey, bKey] = edgeKey.split('|');

    // A vertex blocks traversal if an opponent owns it
    const aBlocked = players.some(p => p.id !== player.id &&
      (p.villages.has(aKey) || p.cities.has(aKey)));
    const bBlocked = players.some(p => p.id !== player.id &&
      (p.villages.has(bKey) || p.cities.has(bKey)));

    if (!adj.has(aKey)) adj.set(aKey, []);
    if (!adj.has(bKey)) adj.set(bKey, []);

    // Only add traversal direction if the vertex isn't blocked
    if (!aBlocked) adj.get(aKey).push({ edgeKey, next: bKey });
    if (!bBlocked) adj.get(bKey).push({ edgeKey, next: aKey });
  }

  let best = 0;

  // DFS from every vertex, tracking visited edges to avoid re-use
  function dfs(vertex, visitedEdges) {
    let max = visitedEdges.size;
    const neighbours = adj.get(vertex) || [];

    for (const { edgeKey, next } of neighbours) {
      if (visitedEdges.has(edgeKey)) continue;
      visitedEdges.add(edgeKey);
      const result = dfs(next, visitedEdges);
      if (result > max) max = result;
      visitedEdges.delete(edgeKey);
    }
    return max;
  }

  for (const vertex of adj.keys()) {
    const length = dfs(vertex, new Set());
    if (length > best) best = length;
  }

  return best;
}

function updateLongestRoad(checkAll = false) {
  if (GAME_CONFIG.mode !== 'classic') return;
  const playersToCheck = checkAll ? players : [activePlayer()];

  for (const player of playersToCheck) {
    const length = calcLongestRoad(player);
    player.longestRoadLength = length;

    if (length >= 5 && length > longestRoadLength) {
      if (longestRoadOwner && longestRoadOwner.id !== player.id) {
        updateVP(longestRoadOwner, -2);
      }
      if (!longestRoadOwner || longestRoadOwner.id !== player.id) {
        updateVP(player, 2);
        showMessage(`🛤️ ${player.name} claims Longest Road!`);
      }
      longestRoadOwner  = player;
      longestRoadLength = length;

      const badge = document.getElementById('longest-road-badge');
      badge.style.display = 'inline';
      badge.style.color   = player.color;
      document.getElementById('lr-count').textContent = longestRoadLength;
    }
  }
}


/* ================================================================
   SECTION 14 · RESOURCE & BANK LOGIC
   ================================================================ */

/**
 * addResourceForPlayer — adds or removes a resource for a specific player,
 * adjusting the bank accordingly.
 */
function addResourceForPlayer(player, type, amount = 1) {
  if (!(type in player.resources)) return;

  if (amount > 0) {
    // Taking from bank — check availability
    if (bank[type] < amount) return; // not enough in bank, no one gets it this turn
    bank[type] -= amount;
  } else {
    // Returning to bank
    bank[type] += Math.abs(amount);
  }

  player.resources[type] += amount;

  // Only update HUD if this is the currently visible player
  if (player.id === activePlayer().id) {
    const entry = RESOURCE_CONFIG.find(r => r.type === type);
    if (entry) {
      const el = document.getElementById(entry.id);
      el.querySelector('span').textContent = player.resources[type];
      el.classList.add('updated');
      setTimeout(() => el.classList.remove('updated'), 300);
    }
  }
}

/**
 * addResource — increments a resource for the active player and updates the HUD.
 * @param {string} type   — must match a key in resources
 * @param {number} amount
 */
function addResource(type, amount = 1) {
  addResourceForPlayer(activePlayer(), type, amount);
}

/**
 * collectResources — finds all land tiles matching the roll number,
 * checks each of their 6 vertices for a settlement, and awards
 * the tile's resource to the player for each one found.
 * @param {number} roll
 */
function collectResources(roll) {
  for (const tile of landTileCache) {
    if (tile.number !== roll) continue;
    if (robberTile && robberTile.q === tile.q && robberTile.r === tile.r) continue;

    const info = TERRAIN[tile.terrain];
    if (!info.resource) continue;

    const { x, y } = hexToPixel(tile.q, tile.r);
    const corners  = hexCorners(x, y, HEX_SIZE);

    // First calculate total owed to all players for this tile
    let totalOwed = 0;
    corners.forEach(c => {
      const key = `${roundCoord(c.x)},${roundCoord(c.y)}`;
      for (const player of players) {
        if (player.villages.has(key)) totalOwed += 1;
        if (player.cities.has(key))   totalOwed += 2;
      }
    });

    // If bank can't cover full payout, skip this tile entirely
    if (bank[info.resource] < totalOwed) {
      showMessage(`🏦 Bank has insufficient ${info.resource} — no one collects`);
      continue;
    }

    // Bank can cover — pay everyone
    corners.forEach(c => {
      const key = `${roundCoord(c.x)},${roundCoord(c.y)}`;
      for (const player of players) {
        if (player.villages.has(key)) addResourceForPlayer(player, info.resource, 1);
        if (player.cities.has(key))   addResourceForPlayer(player, info.resource, 2);
      }
    });
  }
}


function canAfford(cost) {
  return Object.entries(cost).every(([type, amt]) => activePlayer().resources[type] >= amt);
}

function spendResources(cost) {
  Object.entries(cost).forEach(([type, amt]) => addResource(type, -amt));
}


/* ================================================================
   SECTION 15 · TRADING
   ================================================================ */

/**
 * getPortRateForResource — checks if active player has a settlement
 * or city on any port vertex. Returns best available rate for that resource.
 * 4 = default, 3 = any port, 2 = resource-specific port
 */
function getPortRateForResource(type) {
  let best = 4; // default bank rate

  for (const port of ports) {
    // Check if active player has a village or city on either mouth vertex
    const hasAccess = port.vertices.some(vKey =>
      activePlayer().villages.has(vKey) ||
      activePlayer().cities.has(vKey)
    );
    if (!hasAccess) continue;

    if (port.rate === 3 && best > 3) best = 3;
    if (port.rate === 2 && port.type === type.toLowerCase()) best = 2;
  }

  return best;
}

/**
 * updateTradePanel — refreshes the rate label next to each
 * resource option so player can see their best available rate.
 */
function updateTradePanel() {
  const give = document.getElementById('trade-give');
  give.innerHTML = '';
  RESOURCE_CONFIG.forEach(({ type, icon }) => {
    const rate   = getPortRateForResource(type);
    const option = document.createElement('option');
    option.value       = type;
    option.textContent = `${icon} ${type} (${rate}:1)`;
    give.appendChild(option);
  });

  const get = document.getElementById('trade-get');
  get.innerHTML = '';
  RESOURCE_CONFIG.forEach(({ type, icon }) => {
    const option = document.createElement('option');
    option.value       = type;
    option.textContent = `${icon} ${type}`;
    get.appendChild(option);
  });
}

function initTrade() {
  document.getElementById('trade-open-btn').addEventListener('click', () => {
    updateTradePanel(); // refresh rates when opened
    document.getElementById('trade-panel').classList.toggle('open');
  });

  document.getElementById('trade-close').addEventListener('click', () => {
    document.getElementById('trade-panel').classList.remove('open');
  });

  document.getElementById('trade-btn').addEventListener('click', () => {
    const give = document.getElementById('trade-give').value;
    const get  = document.getElementById('trade-get').value;

    if (give === get) {
      showMessage('⚠️ Cannot trade a resource for itself');
      return;
    }

    const rate = getPortRateForResource(give);

    if (activePlayer().resources[give] < rate) {
      showMessage(`⚠️ Need ${rate} ${give} to trade`);
      return;
    }

    addResourceForPlayer(activePlayer(), give, -rate);
    addResourceForPlayer(activePlayer(), get,   1);
    showMessage(`✅ Traded ${rate} ${give} for 1 ${get}`);
    updateTradePanel();
  });
}


/* ================================================================
   SECTION 16 · ROBBER
   ================================================================ */

// Tracks which tile the robber is on (axial coords)
let robberTile = null;

// Queue of players who need to discard on a robber roll
let discardQueue = [];

function totalResources(player) {
  return Object.values(player.resources).reduce((a, b) => a + b, 0);
}

function handleRobber() {
  // Build queue of all players with 8+ resources
  discardQueue = players.filter(p => totalResources(p) >= 8);

  if (discardQueue.length === 0) {
    activateRobberMove();
    return;
  }

  processDiscardQueue();
}

function processDiscardQueue() {
  if (discardQueue.length === 0) {
    activateRobberMove();
    return;
  }

  // Take next player from queue
  const player   = discardQueue[0];
  const required = Math.floor(totalResources(player) / 2);
  openDiscardPanel(player, required);
}

function openDiscardPanel(player, required) {
  document.getElementById('discard-overlay').classList.add('active');
  document.getElementById('discard-panel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'discard-panel';

  // Colour-code the panel border to the discarding player
  panel.style.borderColor = player.color;

  const resourceTypes = ['Lumber', 'Brick', 'Wool', 'Grain', 'Ore'];
  const icons     = { Lumber: '🌲', Wool: '🐑', Grain: '🌾', Brick: '🧱', Ore: '⛰️' };
  const toDiscard = { Lumber: 0, Wool: 0, Grain: 0, Brick: 0, Ore: 0 };

  panel.innerHTML = `
    <div id="discard-title" style="color:${player.color}">${player.name} — Discard ${required}</div>
    <div id="discard-remaining">Still to discard: <span id="discard-count">${required}</span></div>
    <div id="discard-rows"></div>
    <button id="discard-confirm" disabled>Confirm</button>
  `;
  document.body.appendChild(panel);

  const rows = document.getElementById('discard-rows');
  resourceTypes.forEach(type => {
    if (player.resources[type] === 0) return; // hide resources player doesn't have
    const row = document.createElement('div');
    row.className = 'discard-row';
    row.innerHTML = `
      <span>${icons[type]} ${type}</span>
      <span class="discard-have">Have: ${player.resources[type]}</span>
      <button class="discard-minus" data-type="${type}">−</button>
      <span class="discard-val" id="dval-${type}">0</span>
      <button class="discard-plus" data-type="${type}">+</button>
    `;
    rows.appendChild(row);
  });

  function updateDiscard() {
    const total = Object.values(toDiscard).reduce((a, b) => a + b, 0);
    document.getElementById('discard-count').textContent = required - total;
    document.getElementById('discard-confirm').disabled  = total !== required;
  }

  panel.addEventListener('click', (e) => {
    const type = e.target.dataset.type;
    if (!type) return;

    if (e.target.classList.contains('discard-plus')) {
      const total = Object.values(toDiscard).reduce((a, b) => a + b, 0);
      if (toDiscard[type] < player.resources[type] && total < required) {
        toDiscard[type]++;
        document.getElementById(`dval-${type}`).textContent = toDiscard[type];
        updateDiscard();
      }
    }
    if (e.target.classList.contains('discard-minus')) {
      if (toDiscard[type] > 0) {
        toDiscard[type]--;
        document.getElementById(`dval-${type}`).textContent = toDiscard[type];
        updateDiscard();
      }
    }
  });

  document.getElementById('discard-confirm').addEventListener('click', () => {
    // Deduct resources from this specific player
    Object.entries(toDiscard).forEach(([type, amt]) => {
      if (amt > 0) addResourceForPlayer(player, type, -amt);
    });

    // Only remove overlay when entire queue is done
    if (discardQueue.length === 1) {
      document.getElementById('discard-overlay').classList.remove('active');
    }
    panel.remove();

    // Move to next in queue
    discardQueue.shift();
    processDiscardQueue();
  });
}

/**
 * placeRobberToken — renders or moves the robber SVG element.
 * Removes old token first, then draws at new tile centre.
 */
function placeRobberToken(tile) {
  const svg = document.getElementById('board-svg');

  document.getElementById('robber-label')?.remove();
  document.getElementById('robber-token')?.remove();

  const { x, y } = hexToPixel(tile.q, tile.r);

  // Outer dark circle
  const circle = svgEl('circle', {
    id:               'robber-token',
    cx:               x.toFixed(2),
    cy:               (y - 18).toFixed(2),
    r:                12,
    fill:             'rgba(20,10,5,0.85)',
    stroke:           '#c0392b',
    'stroke-width':   1.5,
    'pointer-events': 'none',
  });
  svg.appendChild(circle);

  // Emoji label
  const label = svgEl('text', {
    id:                  'robber-label',
    x:                   x.toFixed(2),
    y:                   (y - 14).toFixed(2),
    'text-anchor':       'middle',
    'dominant-baseline': 'central',
    'font-size':         '13',
    'pointer-events':    'none',
  });
  label.textContent = '🥷';
  svg.appendChild(label);

  robberTile = tile;
}

/**
 * initRobber — places robber on desert tile at game start.
 */
function initRobber() {
  const desert = landTileCache.find(t => t.terrain === 'desert');
  if (desert) placeRobberToken(desert);
}

/**
 * activateRobberMove — highlights land tiles and waits for player
 * to tap one to move the robber there.
 */
function activateRobberMove() {
  document.getElementById('end-turn-btn').disabled   = true;
  document.getElementById('trade-open-btn').disabled = true;
  showMessage('🥷 Tap a tile to move the robber');

  // Add click listener to each land tile hex group
  document.querySelectorAll('.hex-group').forEach(g => {
    const q    = parseInt(g.dataset.q);
    const r    = parseInt(g.dataset.r);
    const tile = landTileCache.find(t => t.q === q && t.r === r);
    if (!tile) return; // skip ocean tiles

    g.classList.add('robber-target');
    g.addEventListener('click', onRobberTileClick, { once: true });
  });
}

function onRobberTileClick(e) {
  // Clean up all highlights and listeners
  document.querySelectorAll('.hex-group').forEach(g => {
    g.classList.remove('robber-target');
    g.removeEventListener('click', onRobberTileClick);
  });

  const q    = parseInt(e.currentTarget.dataset.q);
  const r    = parseInt(e.currentTarget.dataset.r);
  const tile = landTileCache.find(t => t.q === q && t.r === r);
  if (!tile) return;

  // Can't place on same tile
  if (robberTile && robberTile.q === tile.q && robberTile.r === tile.r) {
    showMessage('🥷 Must move the robber to a new tile');
    activateRobberMove();
    return;
  }

  placeRobberToken(tile);

  // Find opponents with villages or cities on this tile's vertices
  const { x, y }   = hexToPixel(tile.q, tile.r);
  const corners     = hexCorners(x, y, HEX_SIZE);
  const cornerKeys  = corners.map(c => `${roundCoord(c.x)},${roundCoord(c.y)}`);

  // Build list of unique opponents present on this tile
  const opponents = [];
  for (const player of players) {
    if (player.id === activePlayer().id) continue;
    const present = cornerKeys.some(k =>
      player.villages.has(k) || player.cities.has(k)
    );
    if (present) opponents.push(player);
  }

  if (opponents.length === 0) {
    showMessage(`🥷 Robber moved — no one to steal from`);
    document.getElementById('end-turn-btn').disabled   = false;
    document.getElementById('trade-open-btn').disabled = false;
    return;
  }

  if (opponents.length === 1) {
    // Only one opponent — steal automatically
    stealResource(opponents[0]);
    document.getElementById('end-turn-btn').disabled   = false;
    document.getElementById('trade-open-btn').disabled = false;
    return;
  }

  // Multiple opponents — let active player pick who to steal from
  openStealPanel(opponents);
}

/**
 * stealResource — takes 1 random resource from target player.
 */
function stealResource(target) {
  // Get resources the target actually has
  const available = Object.entries(target.resources)
    .filter(([, amt]) => amt > 0)
    .map(([type]) => type);

  if (available.length === 0) {
    showMessage(`🥷 ${target.name} has nothing to steal`);
    return;
  }

  // Pick a random resource
  const type = available[Math.floor(Math.random() * available.length)];
  addResourceForPlayer(target, type, -1);
  addResourceForPlayer(activePlayer(), type,  1);
  showMessage(`🥷 Stole 1 ${type} from ${target.name}`);
}

/**
 * openStealPanel — shown when multiple opponents are on the robber tile.
 */
function openStealPanel(opponents) {
  const panel = document.createElement('div');
  panel.id = 'steal-panel';
  panel.innerHTML = `<div id="steal-title">🥷 Who to steal from?</div><div id="steal-btns"></div>`;
  document.body.appendChild(panel);

  const btns = document.getElementById('steal-btns');
  opponents.forEach(opponent => {
    const btn = document.createElement('button');
    btn.className         = 'steal-btn';
    btn.textContent       = opponent.name;
    btn.style.borderColor = opponent.color;
    btn.style.color       = opponent.color;
    btn.addEventListener('click', () => {
      stealResource(opponent);
      panel.remove();
      document.getElementById('end-turn-btn').disabled   = false;
      document.getElementById('trade-open-btn').disabled = false;
    });
    btns.appendChild(btn);
  });
}


/* ================================================================
   SECTION 17 · DEVELOPMENT CARDS
   ================================================================ */

// Development card deck and state
let devDeck             = [];
let freeRoads           = 0;       // set to 2 when Road Building is played
let largestArmyOwner    = null;
let largestArmyCount    = 0;
let devCardPlayedThisTurn = false;

const DEV_CARD_LABELS = {
  knight:       '🗡️ Knight',
  vp:           '⭐ Victory Point',
  roadBuilding: '🛤️ Road Building',
  yearOfPlenty: '🌾 Year of Plenty',
  monopoly:     '💰 Monopoly',
};

const DEV_COST = { Wool: 1, Grain: 1, Ore: 1 };

/**
 * buildDevDeck — creates and shuffles the 25-card dev deck.
 */
function buildDevDeck() {
  const deck = [
    ...Array(14).fill('knight'),
    ...Array(5).fill('vp'),
    ...Array(2).fill('roadBuilding'),
    ...Array(2).fill('yearOfPlenty'),
    ...Array(2).fill('monopoly'),
  ];
  devDeck = shuffle(deck);
}

/**
 * buyDevCard — costs Wool + Grain + Ore, draws top card.
 * VP cards apply immediately.
 */
function buyDevCard() {
  if (devDeck.length === 0) {
    showMessage('⚠️ No dev cards remaining');
    return;
  }
  if (!canAfford(DEV_COST)) {
    showMessage('⚠️ Need 🐑 🌾 ⛰️ to buy a dev card');
    return;
  }
  spendResources(DEV_COST);

  const card = devDeck.pop();
  document.getElementById('dev-deck-count').textContent = `🎴 ${devDeck.length}`;

  if (card === 'vp') {
    // VP cards apply immediately and silently
    activePlayer().devCards.push(card);
    updateVP(activePlayer(), 1);
    showMessage('⭐ Victory Point card drawn!');
    return;
  }

  activePlayer().devCards.push(card);
  // Mark as bought this turn — cannot play until next turn
  activePlayer().newDevCards.add(activePlayer().devCards.length - 1);
  showMessage(`🎴 Drew: ${DEV_CARD_LABELS[card]}`);
  updateHandCount();
  renderDevHand();
}

/**
 * playDevCard — executes a card's effect.
 */
function playDevCard(index) {
  const card = activePlayer().devCards[index];
  if (!card || card === 'vp') return;
  if (devCardPlayedThisTurn) {
    showMessage('⚠️ Can only play one dev card per turn');
    return;
  }
  devCardPlayedThisTurn = true;
  if (activePlayer().newDevCards.has(index)) {
    showMessage('⚠️ Cannot play a card bought this turn');
    return;
  }

  // Remove card from hand
  activePlayer().devCards.splice(index, 1);
  activePlayer().newDevCards.delete(index);
  // Shift newDevCard indices down
  const updated = new Set();
  for (const i of activePlayer().newDevCards) {
    updated.add(i > index ? i - 1 : i);
  }
  activePlayer().newDevCards = updated;

  closeDevPanel();
  updateHandCount();

  if (card === 'knight')       playKnight();
  if (card === 'roadBuilding') playRoadBuilding();
  if (card === 'yearOfPlenty') openYearOfPlentyPanel();
  if (card === 'monopoly')     openMonopolyPanel();
}

function playKnight() {
  activePlayer().knightCount++;
  updateLargestArmy();
  activateRobberMove();
  showMessage('🗡️ Knight played — move the robber');
}

function updateLargestArmy() {
  const p     = activePlayer();
  const count = p.knightCount;

  if (count >= 3 && count > largestArmyCount) {
    if (largestArmyOwner && largestArmyOwner.id !== p.id) {
      updateVP(largestArmyOwner, -2);
    }
    if (!largestArmyOwner || largestArmyOwner.id !== p.id) {
      updateVP(p, 2);
      showMessage(`🗡️ ${p.name} claims Largest Army!`);
    }
    largestArmyOwner = p;
    largestArmyCount = count;

    const badge = document.getElementById('largest-army-badge');
    badge.style.display = 'inline';
    badge.style.color   = p.color;
    document.getElementById('la-count').textContent = largestArmyCount;
  }
}

function playRoadBuilding() {
  freeRoads = 2;
  showMessage('🛤️ Place 2 free roads');
}

function openYearOfPlentyPanel() {
  const resourceTypes = ['Lumber', 'Brick', 'Wool', 'Grain', 'Ore'];
  const icons = { Lumber: '🌲', Wool: '🐑', Grain: '🌾', Brick: '🧱', Ore: '⛰️' };
  let picks = [];

  const panel = document.createElement('div');
  panel.id = 'yop-panel';
  panel.innerHTML = `
    <div id="yop-title">🌾 Year of Plenty — Pick 2 resources</div>
    <div id="yop-remaining">Still to pick: <span id="yop-count">2</span></div>
    <div id="yop-btns"></div>
    <button id="yop-confirm" disabled>Confirm</button>
  `;
  document.body.appendChild(panel);

  const btns = document.getElementById('yop-btns');
  resourceTypes.forEach(type => {
    const btn = document.createElement('button');
    btn.className   = 'yop-btn';
    btn.textContent = `${icons[type]} ${type}`;
    btn.addEventListener('click', () => {
      if (picks.length >= 2) return;
      picks.push(type);
      document.getElementById('yop-count').textContent = 2 - picks.length;
      document.getElementById('yop-confirm').disabled  = picks.length < 2;
      // Visual feedback
      if (picks.length >= 2) btns.querySelectorAll('.yop-btn')
        .forEach(b => b.disabled = true);
    });
    btns.appendChild(btn);
  });

  document.getElementById('yop-confirm').addEventListener('click', () => {
    picks.forEach(type => addResourceForPlayer(activePlayer(), type, 1));
    showMessage(`✅ Received ${picks.join(' + ')}`);
    panel.remove();
  });
}

function openMonopolyPanel() {
  const resourceTypes = ['Lumber', 'Brick', 'Wool', 'Grain', 'Ore'];
  const icons = { Lumber: '🌲', Wool: '🐑', Grain: '🌾', Brick: '🧱', Ore: '⛰️' };

  const panel = document.createElement('div');
  panel.id = 'monopoly-panel';
  panel.innerHTML = `
    <div id="monopoly-title">💰 Monopoly — Claim one resource from all players</div>
    <div id="monopoly-btns"></div>
  `;
  document.body.appendChild(panel);

  const btns = document.getElementById('monopoly-btns');
  resourceTypes.forEach(type => {
    const btn = document.createElement('button');
    btn.className   = 'monopoly-btn';
    btn.textContent = `${icons[type]} ${type}`;
    btn.addEventListener('click', () => {
      let total = 0;
      // Take all of this resource from every other player
      players.forEach(p => {
        if (p.id === activePlayer().id) return;
        const amt = p.resources[type];
        if (amt > 0) {
          addResourceForPlayer(p, type, -amt);
          total += amt;
        }
      });
      addResourceForPlayer(activePlayer(), type, total);
      showMessage(`💰 Monopoly! Claimed ${total} ${type}`);
      panel.remove();
    });
    btns.appendChild(btn);
  });
}

/**
 * renderDevHand — shows the player's dev cards in a panel.
 */
function renderDevHand() {
  document.getElementById('dev-panel')?.remove();

  const playable = activePlayer().devCards
    .map((card, i) => ({ card, i }))
    .filter(({ card }) => card !== 'vp');

  if (playable.length === 0) {
    showMessage('No playable dev cards');
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'dev-panel';
  panel.innerHTML = `
    <div id="dev-title">🎴 Dev Cards</div>
    <div id="dev-list"></div>
    <button id="dev-close">✕</button>
  `;
  document.body.appendChild(panel);

  const list = document.getElementById('dev-list');
  playable.forEach(({ card, i }) => {
    const row   = document.createElement('div');
    row.className = 'dev-row';
    const isNew = activePlayer().newDevCards.has(i);
    row.innerHTML = `
      <span class="dev-card-label ${isNew ? 'dev-new' : ''}">${DEV_CARD_LABELS[card]}</span>
      <button class="dev-play-btn" ${isNew ? 'disabled' : ''} data-index="${i}">Play</button>
    `;
    list.appendChild(row);
  });

  document.getElementById('dev-close').addEventListener('click', closeDevPanel);
  panel.addEventListener('click', e => {
    if (e.target.classList.contains('dev-play-btn') && !e.target.disabled) {
      playDevCard(parseInt(e.target.dataset.index));
    }
  });
}

function closeDevPanel() {
  document.getElementById('dev-panel')?.remove();
}

function updateHandCount() {
  if (GAME_CONFIG.mode !== 'classic') return;
  const playable = activePlayer().devCards.filter(c => c !== 'vp').length;
  document.getElementById('dev-hand-btn').textContent =
    `🃏 Hand${playable > 0 ? ` (${playable})` : ''}`;
}


/* ================================================================
   SECTION 18 · VICTORY CONDITIONS
   ================================================================ */

// Longest Road & Largest Army trackers
let longestRoadOwner  = null; // player object or null
let longestRoadLength = 0;    // current record length

/**
 * getVictoryTarget — returns the VP needed for a player to win.
 * Expansion files override this function for their own win conditions.
 * @param {Object} player
 * @returns {number}
 */
function getVictoryTarget(player) {
  return GAME_CONFIG.vpToWin + (player.hasShoe ? 1 : 0);
}

function updateVP(player, delta) {
  player.victoryPoints += delta;
  updateScoreboard();
  checkVictory(player);
}

function checkVictory(player) {
  if (player.victoryPoints < getVictoryTarget(player)) return;
  const screen = document.getElementById('victory-screen');
  document.getElementById('victory-name').textContent = player.name;
  document.getElementById('victory-name').style.color = player.color;
  document.getElementById('victory-vp').textContent   = `${player.victoryPoints} Victory Points`;
  screen.classList.add('visible');
}


/* ================================================================
   SECTION 19 · UI & HUD
   ================================================================ */

function showMessage(text, duration = 2000) {
  const el = document.getElementById('game-message');
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('visible'), duration);
}
function buildScoreboard() {
  const board = document.getElementById('player-scoreboard');
  board.innerHTML = '';
  players.forEach(p => {
    const entry = document.createElement('span');
    entry.className   = 'score-entry';
    entry.id          = `score-${p.id}`;
    entry.innerHTML   = `<span class="score-dot" style="color:${p.color}">●</span><span class="score-vp" id="score-vp-${p.id}">${p.victoryPoints}</span>`;
    board.appendChild(entry);
  });
}

function updateScoreboard() {
  players.forEach(p => {
    const el = document.getElementById(`score-vp-${p.id}`);
    if (!el) return;
    el.textContent = p.victoryPoints;
    // Highlight active player entry
    const entry = document.getElementById(`score-${p.id}`);
    entry.classList.toggle('score-active', p.id === activePlayer().id);
  });
}

function updateHudForPlayer(player) {
  updateTradePanel();
updateScoreboard();

  // Update resource counts in HUD using RESOURCE_CONFIG
  RESOURCE_CONFIG.forEach(({ type, id }) => {
    document.getElementById(id).querySelector('span').textContent = player.resources[type];
  });

  // Tint HUD to active player colour
  document.getElementById('hud').style.borderBottom      = `2px solid ${player.color}`;
  document.getElementById('turn-label').style.color      = player.color;
  showMessage(`${player.name}'s turn`);
  updateHandCount();
  updateFishBtn();
}


/* ================================================================
   SECTION 20 · INITIALISATION
   ================================================================ */

// Cached land tiles set during initBoard — used by collectResources
let landTileCache = [];

// Generated port data — filled by buildPorts()
let ports = [];


  function initBoard() {
  const svg   = document.getElementById('board-svg');
  const tiles = (typeof buildBoardOverride === 'function')
    ? buildBoardOverride()
    : buildBoard();
  // --- Tile layers ---
  const oceanTiles = tiles.filter(t =>  t.isOcean);
  const landTiles  = tiles.filter(t => !t.isOcean);

  oceanTiles.forEach(t => renderTile(svg, t));
  landTiles.forEach( t => renderTile(svg, t));

  landTileCache = landTiles;
  buildPorts();
    if (GAME_CONFIG.mode === 'classic' || GAME_CONFIG.fishermen) renderPorts();
  buildFisheries();
renderFisheries();
  if (GAME_CONFIG.fishermen) {
  fishPool = shuffle([...FISH_TOKENS_BASE]);
}
  initRobber();

  // --- Graph layers (edges before vertices so dots sit on top of lines) ---
  const { vertices, edges } = buildGraph(
    typeof buildGraphCoords !== 'undefined' ? buildGraphCoords : LAND_COORDS,
    tiles
  );
  renderEdges(svg, edges);

  renderVertices(svg, vertices);

  // --- End Turn button ---
  document.getElementById('end-turn-btn').addEventListener('click', runEndTurn);

  // --- Roll Dice button ---
  document.getElementById('roll-dice-btn').addEventListener('click', runRollDice);

applyPlayerExtensions();
buildScoreboard();
  buildSetupOrder();
  buildDevDeck();
  currentPlayerIndex = setupOrder[0];
  updateHudForPlayer(activePlayer());
  updateTurnLabel();
  document.getElementById('end-turn-btn').style.display  = 'none';
  document.getElementById('roll-dice-btn').style.display = 'none';

  // Buy a dev card from the deck
  document.getElementById('dev-buy-btn').addEventListener('click', () => {
    if (GAME_CONFIG.mode !== 'classic') return;
    if (gamePhase !== 'play') { showMessage('⚠️ Cannot buy dev cards during setup'); return; }
    buyDevCard();
  });

  // Open hand to view and play existing dev cards
  document.getElementById('dev-hand-btn').addEventListener('click', () => {
    if (GAME_CONFIG.mode !== 'classic') return;
    const panel = document.getElementById('dev-panel');
    if (panel) { closeDevPanel(); return; }
    if (gamePhase !== 'play') { showMessage('⚠️ Cannot play dev cards during setup'); return; }
    renderDevHand();
  });

 
 document.getElementById('fish-market-btn').addEventListener('click', () => {
  if (gamePhase !== 'play') return;
  const panel = document.getElementById('fish-market-panel');
  if (panel) { panel.remove(); return; }
  openFishMarket();
});
  
  
}

function initStartScreen() {
  let selectedCount = 1;

  // Player count buttons
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCount = parseInt(btn.dataset.count);
    });
  });

  // VP target buttons
  document.querySelectorAll('.vp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vp-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GAME_CONFIG.vpToWin = parseInt(btn.dataset.vp);
    });
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GAME_CONFIG.mode = btn.dataset.mode;

      if (GAME_CONFIG.mode === 'explorers' && typeof epInit === 'function') {
        epInit();
      } else {
        // Restore Classic defaults if switching away from E&P
        CX = 200;
        CY = 200;
        delete window.buildBoardOverride;
        delete window.buildGraphCoords;
        document.getElementById('board-svg')
          .setAttribute('viewBox', '-300 -400 1200 1000');
        
      }
    });
  });
  
  // Fishermen toggle
document.getElementById('fishermen-toggle').addEventListener('click', () => {
  GAME_CONFIG.fishermen = !GAME_CONFIG.fishermen;
  const btn = document.getElementById('fishermen-toggle');
  btn.dataset.active = GAME_CONFIG.fishermen;
  btn.classList.toggle('active', GAME_CONFIG.fishermen);
});
  
  // Start button
  document.getElementById('start-btn').addEventListener('click', () => {
    // Trim players array to selected count
    players.splice(selectedCount);

    // Hide start screen
    document.getElementById('start-screen').style.display = 'none';

    // Restart logic
    document.getElementById('victory-restart').addEventListener('click', () => {
      location.reload();
    });

    // Boot the game
    initBoard();
    initZoom();
    initTrade();
    updateHudForPlayer(activePlayer());
  });
}

// Run once the HTML is fully parsed
document.addEventListener('DOMContentLoaded', () => {
  initStartScreen();
  document.getElementById('menu-btn').addEventListener('click', () => {
    const menu = document.getElementById('game-menu');
    menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    location.reload();
  });
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#menu-btn') && !e.target.closest('#game-menu')) {
      document.getElementById('game-menu').style.display = 'none';
    }
  });
  
  document.getElementById('cheat-btn').addEventListener('click', () => {
    ['Lumber', 'Brick', 'Wool', 'Grain', 'Ore'].forEach(r =>
      addResourceForPlayer(activePlayer(), r, 5)
    );
    showMessage('🎁 +5 of each resource');
  });
});
