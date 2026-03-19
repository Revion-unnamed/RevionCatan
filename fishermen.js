/* ================================================================
   fishermen.js — Fishermen of Catan scenario
   Depends on: catan.js (must load first)
   ================================================================ */

// ---- Fishermen of Catan ----
// 29 fish tokens: 11×1, 10×2, 8×3 plus 1 Old Shoe
const FISH_TOKENS_BASE = [
  ...Array(11).fill(1),
  ...Array(10).fill(2),
  ...Array(8).fill(3),
  'shoe',
];

const FISHERY_NUMBERS = [4, 5, 6, 8, 9, 10]; // one per fishery tile

let fisheryTiles = []; // filled by buildFisheries(), shape: { q, r, number }

let fishPool    = [];   // live face-down draw pile
let fishDiscard = [];   // spent tokens — reshuffled when pool empties


function buildFisheries() {
  // Find ocean tiles that have no port
  const portCoords = ports.map(p => `${p.oceanCoord.q},${p.oceanCoord.r}`);
  const candidates = OCEAN_COORDS.filter(c => !portCoords.includes(`${c.q},${c.r}`));
  // Pick 6 at random
  const picked = shuffle([...candidates]).slice(0, 6);
  const numbers = shuffle([...FISHERY_NUMBERS]);
  fisheryTiles = picked.map((coord, i) => ({ ...coord, number: numbers[i] }));
}

function renderFisheries() {
  if (!GAME_CONFIG.fishermen) return;
  const svg = document.getElementById('board-svg');

  fisheryTiles.forEach(tile => {
    const { x, y } = hexToPixel(tile.q, tile.r);
    const isRed = tile.number === 6 || tile.number === 8;

    // Fish icon
    const icon = svgEl('text', {
      x:                   x.toFixed(2),
      y:                   (y - 12).toFixed(2),
      'text-anchor':       'middle',
      'dominant-baseline': 'central',
      'font-size':         '14',
      'pointer-events':    'none',
    });
    icon.textContent = '🎣';
    svg.appendChild(icon);

    // Number token circle
    const circle = svgEl('circle', {
      cx:    x.toFixed(2),
      cy:    (y + 8).toFixed(2),
      r:     12,
      class: `token-circle${isRed ? ' red' : ''}`,
    });
    svg.appendChild(circle);

    // Number text
    const num = svgEl('text', {
      x:           x.toFixed(2),
      y:           (y + 7).toFixed(2),
      class:       `token-number${isRed ? ' red' : ' normal'}`,
      'font-size': '11',
    });
    num.textContent = tile.number;
    svg.appendChild(num);

    // Pip dots
    renderDots(svg, x, y + 18, getPips(tile.number), isRed);
  });
}

function drawFishToken(player, count) {
  for (let i = 0; i < count; i++) {
    if (fishPool.length === 0) {
      if (fishDiscard.length === 0) return; // nothing left
      fishPool = shuffle([...fishDiscard]);
      fishDiscard = [];
    }
    const token = fishPool.pop();
    if (token === 'shoe') {
      receiveShoe(player);
    } else {
      player.fish.push(token);
    }
  }
  updateFishBtn();
}

function collectFish(roll) {
  if (!GAME_CONFIG.fishermen) return;

  // Fishery tiles — each has a single number
  for (const tile of fisheryTiles) {
    if (tile.number !== roll) continue;
    const { x, y } = hexToPixel(tile.q, tile.r);
    const corners  = hexCorners(x, y, HEX_SIZE);
    for (const player of players) {
      corners.forEach(c => {
        const key = `${roundCoord(c.x)},${roundCoord(c.y)}`;
        if (player.villages.has(key)) drawFishToken(player, 1);
        if (player.cities.has(key))   drawFishToken(player, 2);
      });
    }
  }

  // Lake tile — triggers on 2, 3, 11, 12
  if ([2, 3, 11, 12].includes(roll)) {
    const lake = landTileCache.find(t => t.terrain === 'lake');
    if (lake) {
      if (robberTile && robberTile.q === lake.q && robberTile.r === lake.r) return;
      const { x, y } = hexToPixel(lake.q, lake.r);
      const corners  = hexCorners(x, y, HEX_SIZE);
      for (const player of players) {
        corners.forEach(c => {
          const key = `${roundCoord(c.x)},${roundCoord(c.y)}`;
          if (player.villages.has(key)) drawFishToken(player, 1);
          if (player.cities.has(key))   drawFishToken(player, 2);
        });
      }
    }
  }
}

function receiveShoe(player) {
  player.hasShoe = true;
  showMessage(`👟 ${player.name} drew the Old Shoe! +1 VP needed to win`, 3000);
  updateFishBtn();
}

function passShoe() {
  const holder = players.find(p => p.hasShoe);
  if (!holder) return;

  const holderVP = holder.victoryPoints;
  const isLeader = players.every(p => p.victoryPoints <= holderVP);
  const eligible = players.filter(p =>
    p.id !== holder.id && p.victoryPoints >= holderVP
  );

  if (isLeader && eligible.length === 0) {
    showMessage('👟 You have the most VP — you must keep the Old Shoe');
    return;
  }

  if (eligible.length === 1) {
    transferShoe(holder, eligible[0]);
    return;
  }

  // Multiple eligible — open picker
  const panel = document.createElement('div');
  panel.id = 'shoe-panel';
  panel.innerHTML = `<div id="shoe-title">👟 Pass the Old Shoe to:</div><div id="shoe-btns"></div>`;
  document.body.appendChild(panel);

  const btns = document.getElementById('shoe-btns');
  eligible.forEach(p => {
    const btn = document.createElement('button');
    btn.className         = 'steal-btn';
    btn.textContent       = p.name;
    btn.style.borderColor = p.color;
    btn.style.color       = p.color;
    btn.addEventListener('click', () => {
      transferShoe(holder, p);
      panel.remove();
    });
    btns.appendChild(btn);
  });
}

function transferShoe(from, to) {
  from.hasShoe = false;
  to.hasShoe   = true;
  showMessage(`👟 Old Shoe passed to ${to.name}!`, 3000);
  updateFishBtn();
}

function totalFish(player) {
  return player.fish.reduce((a, b) => a + b, 0);
}

function updateFishBtn() {
  if (!GAME_CONFIG.fishermen) return;
  const total = totalFish(activePlayer());
  const shoe  = activePlayer().hasShoe ? ' 👟' : '';
  document.getElementById('fish-market-btn').textContent = `🐟 Fish (${total})${shoe}`;
}

function spendFish(player, cost) {
  // Spend tokens until cost is met — excess is lost (no change rule)
  let remaining = cost;
  // Sort ascending so we use small tokens first, minimising waste
  player.fish.sort((a, b) => a - b);
  const spent = [];
  while (remaining > 0 && player.fish.length > 0) {
    const token = player.fish.shift();
    spent.push(token);
    remaining -= token;
  }
  fishDiscard.push(...spent);
  updateFishBtn();
}

function openFishMarket() {
  document.getElementById('fish-market-panel')?.remove();
  const player = activePlayer();
  const total  = totalFish(player);

  const actions = [
    { cost: 2, label: '↩️ Move robber off board', fn: () => {
      if (!robberTile) {
        showMessage('⚠️ Robber is already off the board');
        return false;
      }
      document.getElementById('robber-token')?.remove();
      document.getElementById('robber-label')?.remove();
      robberTile = null;
      showMessage('🐟 Robber removed from the board');
    }},
    { cost: 3, label: '🥷 Steal resource from any player', fn: () => openFishStealPanel() },
    { cost: 4, label: '🏦 Take any resource from bank',    fn: () => openFishBankPanel()  },
    { cost: 5, label: '🛤️ Build a free road',              fn: () => {
      freeRoads = 1;
      showMessage('🐟 Place 1 free road');
    }},
    { cost: 7, label: '🎴 Draw a free dev card',           fn: () => {
      if (devDeck.length === 0) { showMessage('⚠️ Dev deck empty'); return false; }
      const card = devDeck.pop();
      player.devCards.push(card);
      if (card === 'vp') {
        updateVP(player, 1);
        showMessage('⭐ VP card!');
      } else {
        player.newDevCards.add(player.devCards.length - 1);
        showMessage(`🎴 Drew ${DEV_CARD_LABELS[card]}`);
      }
      updateHandCount();
    }},
  ];

  const tokenDisplay = player.fish.length
    ? player.fish.map(t => `[${t}]`).join(' ')
    : 'No tokens';

  const panel = document.createElement('div');
  panel.id = 'fish-market-panel';
  panel.innerHTML = `
    <div id="fish-market-title">🐟 Fish Market — ${total} fish</div>
    <div id="fish-token-display">Tokens: ${tokenDisplay}</div>
    <div id="fish-actions"></div>
    <button id="fish-close">✕</button>`;
  document.body.appendChild(panel);

  const container = document.getElementById('fish-actions');
  actions.forEach(({ cost, label, fn }) => {
    const row = document.createElement('div');
    row.className = 'fish-action-row';
    const btn = document.createElement('button');
    btn.className   = 'fish-action-btn';
    btn.disabled    = total < cost;
    btn.textContent = `${cost} 🐟 — ${label}`;
    btn.addEventListener('click', () => {
      if (fn() === false) return;
      spendFish(player, cost);
      panel.remove();
      updateFishBtn();
    });
    row.appendChild(btn);
    container.appendChild(row);
  });

  document.getElementById('fish-close').addEventListener('click', () => panel.remove());

  // Shoe passing — only show on active player's turn if they hold it
  if (player.hasShoe) {
    const shoeBtn = document.createElement('button');
    shoeBtn.className   = 'fish-action-btn';
    shoeBtn.textContent = '👟 Pass Old Shoe';
    shoeBtn.addEventListener('click', () => { panel.remove(); passShoe(); });
    container.appendChild(shoeBtn);
  }
}

function openFishStealPanel() {
  const opponents = players.filter(p => p.id !== activePlayer().id);
  const panel = document.createElement('div');
  panel.id = 'steal-panel';
  panel.innerHTML = `<div id="steal-title">🥷 Steal from who?</div><div id="steal-btns"></div>`;
  document.body.appendChild(panel);
  const btns = document.getElementById('steal-btns');
  opponents.forEach(p => {
    const btn = document.createElement('button');
    btn.className         = 'steal-btn';
    btn.textContent       = p.name;
    btn.style.borderColor = p.color;
    btn.style.color       = p.color;
    btn.addEventListener('click', () => { stealResource(p); panel.remove(); });
    btns.appendChild(btn);
  });
}

function openFishBankPanel() {
  const resourceTypes = ['Lumber', 'Brick', 'Wool', 'Grain', 'Ore'];
  const icons = { Lumber: '🌲', Wool: '🐑', Grain: '🌾', Brick: '🧱', Ore: '⛰️' };
  const panel = document.createElement('div');
  panel.id = 'yop-panel'; // reuse yop style
  panel.innerHTML = `<div id="yop-title">🏦 Take 1 resource from bank</div><div id="yop-btns"></div>`;
  document.body.appendChild(panel);
  const btns = document.getElementById('yop-btns');
  resourceTypes.forEach(type => {
    const btn = document.createElement('button');
    btn.className   = 'yop-btn';
    btn.textContent = `${icons[type]} ${type}`;
    btn.addEventListener('click', () => {
      addResourceForPlayer(activePlayer(), type, 1);
      showMessage(`🏦 Took 1 ${type} from bank`);
      panel.remove();
    });
    btns.appendChild(btn);
  });
}


