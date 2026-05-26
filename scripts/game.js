// ══════════════════════════════════════════════
//  PokerIQ — Mini Poker Game Engine (game.js)
//  Educational Texas Hold'em vs bots
//  No real money — credits only
// ══════════════════════════════════════════════

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['♠','♥','♦','♣'];
const RANK_VAL = Object.fromEntries(RANKS.map((r,i)=>[r,i]));

// ── Deck ───────────────────────────────────────
function buildDeck() {
  const d = [];
  SUITS.forEach(s => RANKS.forEach(r => d.push({r,s})));
  return shuffle(d);
}
function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
function cardStr(c) { return c.r+c.s; }
function isRed(c) { return c.s==='♥'||c.s==='♦'; }

// ── Hand Evaluator ─────────────────────────────
function evalHand(cards) {
  const best = { score: -1, name: '' };
  const combos = getCombos(cards, 5);
  combos.forEach(combo => {
    const res = scoreHand(combo);
    if (res.score > best.score) { best.score = res.score; best.name = res.name; best.cards = combo; }
  });
  return best;
}
function getCombos(arr, k) {
  if (k===arr.length) return [arr];
  if (k===1) return arr.map(x=>[x]);
  const result = [];
  arr.forEach((item,i) => {
    getCombos(arr.slice(i+1), k-1).forEach(combo => result.push([item,...combo]));
  });
  return result;
}
function scoreHand(cards) {
  const rs = cards.map(c=>c.r);
  const ss = cards.map(c=>c.s);
  const vs = rs.map(r=>RANK_VAL[r]).sort((a,b)=>b-a);
  const flush = ss.every(s=>s===ss[0]);
  const straight = (vs.every((v,i)=>i===0||vs[i-1]-v===1)) ||
    (vs[0]===12&&vs[1]===3&&vs[2]===2&&vs[3]===1&&vs[4]===0);
  const counts = {};
  rs.forEach(r=>counts[r]=(counts[r]||0)+1);
  const cv = Object.values(counts).sort((a,b)=>b-a);
  const names = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];
  let score;
  if (flush && straight && vs[0]===12) score=9;
  else if (flush && straight) score=8;
  else if (cv[0]===4) score=7;
  else if (cv[0]===3&&cv[1]===2) score=6;
  else if (flush) score=5;
  else if (straight) score=4;
  else if (cv[0]===3) score=3;
  else if (cv[0]===2&&cv[1]===2) score=2;
  else if (cv[0]===2) score=1;
  else score=0;
  return { score, name: names[score], tiebreak: vs };
}

// ── Bot Personalities ──────────────────────────
const BOT_TYPES = {
  TAG:  { name:'TAG Bot',  emoji:'🎯', desc:'Tight Aggressive — raises strong, folds weak' },
  LAG:  { name:'LAG Bot',  emoji:'🔥', desc:'Loose Aggressive — plays many hands, bluffs often' },
  Fish: { name:'Fish Bot', emoji:'🐟', desc:'Calls everything, rarely raises' },
  Nit:  { name:'Nit Bot',  emoji:'🪨', desc:'Only plays premium hands, folds most' }
};

function botDecision(bot, handStrength, pot, toCall, stack, stage) {
  const r = Math.random();
  const hs = handStrength; // 0-9
  const pct = toCall / (pot + toCall + 0.01);

  switch(bot.type) {
    case 'TAG':
      if (hs >= 6) return { action:'raise', amount: Math.min(pot, stack) };
      if (hs >= 3 && pct < 0.4) return { action:'call' };
      if (hs >= 2 && toCall===0) return { action:'check' };
      return { action:'fold' };

    case 'LAG':
      if (hs >= 5) return { action:'raise', amount: Math.min(Math.floor(pot*0.75), stack) };
      if (r < 0.35 && stack > toCall*2) return { action:'raise', amount: Math.min(Math.floor(pot*0.5), stack) };
      if (hs >= 2 || r < 0.5) return toCall===0 ? { action:'check' } : { action:'call' };
      return { action:'fold' };

    case 'Fish':
      if (hs >= 7) return { action:'raise', amount: Math.min(Math.floor(pot*0.5), stack) };
      if (toCall===0) return { action:'check' };
      return { action:'call' };

    case 'Nit':
      if (hs >= 7) return { action:'raise', amount: Math.min(pot, stack) };
      if (hs >= 5 && pct < 0.25) return { action:'call' };
      if (toCall===0) return { action:'check' };
      return { action:'fold' };

    default:
      return toCall===0 ? { action:'check' } : { action:'fold' };
  }
}

// ── Game State ─────────────────────────────────
let G = null;

function initGame(botCount, botTypes) {
  const deck = buildDeck();
  const bots = botTypes.map((type, i) => ({
    id: 'bot'+i, name: BOT_TYPES[type].name,
    emoji: BOT_TYPES[type].emoji, type,
    stack: 500, hole: [], folded: false, bet: 0, allIn: false
  }));

  G = {
    deck, stage: 'preflop',
    pot: 0, board: [],
    player: { id:'player', name:'You', stack:500, hole:[], folded:false, bet:0, allIn:false },
    bots,
    dealer: 0,
    SB: 10, BB: 20,
    toAct: 0, lastRaise: 20,
    actionLog: [],
    result: null,
    waitingForPlayer: false,
    handOver: false
  };

  dealHoleCards();
  postBlinds();
  return G;
}

function dealHoleCards() {
  G.player.hole = [G.deck.pop(), G.deck.pop()];
  G.bots.forEach(b => b.hole = [G.deck.pop(), G.deck.pop()]);
}

function postBlinds() {
  const sb = G.bots[0];
  const bb = G.bots.length > 1 ? G.bots[1] : G.player;
  deductBet(sb, G.SB);
  deductBet(bb, G.BB);
  G.pot += G.SB + G.BB;
  G.lastRaise = G.BB;
  log(`${sb.name} posts SB ${G.SB}`);
  log(`${bb.name} posts BB ${G.BB}`);
}

function deductBet(actor, amount) {
  const actual = Math.min(amount, actor.stack);
  actor.stack -= actual;
  actor.bet += actual;
  if (actor.stack===0) actor.allIn = true;
  return actual;
}

function log(msg) { G.actionLog.unshift(msg); if(G.actionLog.length>12) G.actionLog.pop(); }

// ── Player Action ──────────────────────────────
function playerAction(action, raiseAmount) {
  if (!G || G.handOver || !G.waitingForPlayer) return;
  G.waitingForPlayer = false;

  const toCall = getToCall(G.player);

  if (action==='fold') {
    G.player.folded = true;
    log('You fold');
  } else if (action==='check' && toCall===0) {
    log('You check');
  } else if (action==='call') {
    const amt = deductBet(G.player, toCall);
    G.pot += amt;
    log(`You call ${amt}`);
  } else if (action==='raise') {
    const amt = Math.min(raiseAmount || G.BB*2, G.player.stack);
    const toCallFirst = toCall;
    const totalBet = toCallFirst + amt;
    const actual = deductBet(G.player, totalBet);
    G.pot += actual;
    G.lastRaise = amt;
    log(`You raise to ${G.player.bet}`);
  } else if (action==='allin') {
    const amt = deductBet(G.player, G.player.stack);
    G.pot += amt;
    G.player.allIn = true;
    log(`You go ALL-IN (${amt})`);
  }

  setTimeout(() => runBotActions(), 600);
}
window.playerAction = playerAction;

function getToCall(actor) {
  const maxBet = Math.max(G.player.bet, ...G.bots.map(b=>b.bet));
  return Math.max(0, maxBet - actor.bet);
}

// ── Bot Actions ────────────────────────────────
function runBotActions() {
  const activeBots = G.bots.filter(b=>!b.folded&&!b.allIn);
  if (!activeBots.length) { advanceStage(); return; }

  let i = 0;
  function nextBot() {
    if (i >= activeBots.length) { advanceStage(); return; }
    const bot = activeBots[i++];
    const allCards = [...bot.hole, ...G.board];
    const hs = allCards.length >= 5 ? evalHand(allCards).score : estimatePreflop(bot.hole);
    const toCall = getToCall(bot);
    const dec = botDecision(bot, hs, G.pot, toCall, bot.stack, G.stage);

    if (dec.action==='fold') {
      bot.folded = true;
      log(`${bot.name} folds`);
    } else if (dec.action==='check') {
      log(`${bot.name} checks`);
    } else if (dec.action==='call') {
      const amt = deductBet(bot, toCall);
      G.pot += amt;
      log(`${bot.name} calls ${amt}`);
    } else if (dec.action==='raise') {
      const toCallFirst = toCall;
      const total = toCallFirst + dec.amount;
      const actual = deductBet(bot, total);
      G.pot += actual;
      G.lastRaise = dec.amount;
      log(`${bot.name} raises to ${bot.bet}`);
    }

    renderGame();
    setTimeout(nextBot, 800);
  }
  nextBot();
}

function estimatePreflop(hole) {
  const v0 = RANK_VAL[hole[0].r], v1 = RANK_VAL[hole[1].r];
  const paired = hole[0].r === hole[1].r;
  const suited = hole[0].s === hole[1].s;
  const high = Math.max(v0,v1);
  const sum = v0+v1;
  if (paired && high>=10) return 7;
  if (paired && high>=7) return 5;
  if (paired) return 3;
  if (high===12&&sum>=20) return 6;
  if (high>=10&&sum>=18&&suited) return 5;
  if (high>=10&&sum>=18) return 4;
  if (suited&&sum>=15) return 3;
  if (sum>=18) return 3;
  if (sum>=14) return 2;
  return 1;
}

// ── Advance Stage ──────────────────────────────
function advanceStage() {
  const activePlayers = [G.player,...G.bots].filter(p=>!p.folded);

  if (activePlayers.length===1) {
    awardPot(activePlayers[0]);
    return;
  }

  // Reset bets for new street
  [G.player,...G.bots].forEach(p=>p.bet=0);

  if (G.stage==='preflop') {
    G.stage='flop';
    G.board=[G.deck.pop(),G.deck.pop(),G.deck.pop()];
    log('--- Flop ---');
  } else if (G.stage==='flop') {
    G.stage='turn';
    G.board.push(G.deck.pop());
    log('--- Turn ---');
  } else if (G.stage==='turn') {
    G.stage='river';
    G.board.push(G.deck.pop());
    log('--- River ---');
  } else if (G.stage==='river') {
    showdown();
    return;
  }

  renderGame();
  G.waitingForPlayer = true;
  renderActions();
}

// ── Showdown ───────────────────────────────────
function showdown() {
  G.stage = 'showdown';
  const activePlayers = [G.player,...G.bots].filter(p=>!p.folded);
  let winner = null, bestScore = -1;

  activePlayers.forEach(p => {
    const res = evalHand([...p.hole,...G.board]);
    p.handResult = res;
    if (res.score > bestScore || (res.score===bestScore && compareTiebreak(res.tiebreak, winner?.handResult?.tiebreak))) {
      bestScore = res.score;
      winner = p;
    }
  });

  awardPot(winner);
}

function compareTiebreak(a, b) {
  if (!b) return true;
  for (let i=0;i<Math.min(a.length,b.length);i++) {
    if (a[i]>b[i]) return true;
    if (a[i]<b[i]) return false;
  }
  return false;
}

function awardPot(winner) {
  winner.stack += G.pot;
  G.result = { winner, pot: G.pot };
  G.handOver = true;
  const isPlayer = winner.id==='player';
  log(`🏆 ${winner.name} wins ${G.pot} credits!`);
  if (isPlayer) log('✓ Great hand!');

  // Save credits to Firestore
  if (typeof window.saveCredits === 'function') {
    window.saveCredits(G.player.stack);
  }

  renderGame();
  renderResult();
}

// ── Render Functions ───────────────────────────
function renderGame() {
  if (!G) return;
  const el = document.getElementById('game-area');
  if (!el) return;

  const boardHTML = G.board.map(c =>
    `<div class="pc ${isRed(c)?'red':''}">${c.r}<span>${c.s}</span></div>`
  ).join('') || '<div style="color:rgba(255,255,255,0.3);font-size:0.85rem;padding:0.5rem">Waiting for flop...</div>';

  const botsHTML = G.bots.map(bot => `
    <div class="bot-seat ${bot.folded?'folded':''}">
      <div class="bot-avatar">${bot.emoji}</div>
      <div class="bot-info">
        <div class="bot-name">${bot.name}</div>
        <div class="bot-stack">${bot.stack} cr</div>
      </div>
      <div class="bot-cards">
        ${G.stage==='showdown'&&!bot.folded
          ? bot.hole.map(c=>`<div class="pc sm ${isRed(c)?'red':''}">${c.r}<span>${c.s}</span></div>`).join('')
          : '<div class="pc sm back"></div><div class="pc sm back"></div>'
        }
      </div>
      ${bot.folded?'<div class="fold-badge">FOLDED</div>':''}
      ${bot.allIn?'<div class="allin-badge">ALL IN</div>':''}
      ${bot.handResult&&G.stage==='showdown'?`<div class="hand-badge">${bot.handResult.name}</div>`:''}
    </div>
  `).join('');

  const playerCards = G.player.hole.map(c =>
    `<div class="pc lg ${isRed(c)?'red':''}">${c.r}<span>${c.s}</span></div>`
  ).join('');

  el.innerHTML = `
    <div class="game-table">
      <div class="bots-row">${botsHTML}</div>
      <div class="board-area">
        <div class="pot-display">Pot: ${G.pot} credits</div>
        <div class="board-cards">${boardHTML}</div>
        <div class="stage-badge">${G.stage.toUpperCase()}</div>
      </div>
      <div class="player-area">
        <div class="player-cards">${playerCards}</div>
        <div class="player-meta">
          <span class="player-label">You</span>
          <span class="player-stack">${G.player.stack} cr</span>
          ${G.player.folded?'<span class="fold-badge">FOLDED</span>':''}
          ${G.player.allIn?'<span class="allin-badge">ALL IN</span>':''}
          ${G.player.handResult&&G.stage==='showdown'?`<span class="hand-badge">${G.player.handResult.name}</span>`:''}
        </div>
      </div>
    </div>
    <div class="action-log">
      ${G.actionLog.slice(0,6).map(l=>`<div class="log-line">${l}</div>`).join('')}
    </div>
  `;
}

function renderActions() {
  const el = document.getElementById('game-actions');
  if (!el || !G || G.handOver) return;
  const toCall = getToCall(G.player);
  const canCheck = toCall===0;
  el.innerHTML = `
    <div class="action-btns">
      <button class="abtn fold" onclick="playerAction('fold')">Fold</button>
      ${canCheck
        ? `<button class="abtn check" onclick="playerAction('check')">Check</button>`
        : `<button class="abtn call" onclick="playerAction('call')">Call ${toCall}</button>`}
      <button class="abtn raise" onclick="showRaiseInput()">Raise</button>
      <button class="abtn allin" onclick="playerAction('allin')">All-In</button>
    </div>
    <div id="raise-input" style="display:none;margin-top:0.75rem;display:none">
      <input type="range" id="raise-slider" min="${G.BB*2}" max="${G.player.stack}" step="${G.BB}" value="${G.BB*2}" style="width:100%">
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem;align-items:center">
        <span id="raise-val" style="font-size:0.85rem;color:var(--accent);font-weight:600;min-width:80px">${G.BB*2} cr</span>
        <button class="abtn raise" onclick="confirmRaise()">Confirm Raise</button>
      </div>
    </div>
  `;
  const slider = document.getElementById('raise-slider');
  if (slider) slider.addEventListener('input', e => {
    document.getElementById('raise-val').textContent = e.target.value + ' cr';
  });
}

window.showRaiseInput = function() {
  const el = document.getElementById('raise-input');
  if (el) el.style.display = el.style.display==='none'?'block':'none';
};
window.confirmRaise = function() {
  const v = parseInt(document.getElementById('raise-slider')?.value||G.BB*2);
  playerAction('raise', v);
};

function renderResult() {
  const el = document.getElementById('game-actions');
  if (!el||!G.result) return;
  const won = G.result.winner.id==='player';
  el.innerHTML = `
    <div class="result-banner ${won?'win':'lose'}">
      <div class="result-title">${won?'🏆 You Win!':'💀 You Lose'}</div>
      <div class="result-sub">${G.result.winner.name} wins ${G.result.pot} credits</div>
      ${won&&G.player.handResult?`<div class="result-hand">${G.player.handResult.name}</div>`:''}
    </div>
    <div style="display:flex;gap:0.75rem;margin-top:1rem;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="startNewHand()">Deal Next Hand</button>
      <button class="btn btn-secondary" onclick="endGame()">Leave Table</button>
    </div>
  `;
}

window.startNewHand = function() {
  if (!G) return;
  // Remove broke players
  G.bots = G.bots.filter(b=>b.stack>0);
  if (!G.bots.length) { endGame(); return; }
  if (G.player.stack<=0) {
    // Free rebuy — 100 credits
    G.player.stack = 100;
    log('You were broke — rebuy 100 credits');
  }
  const types = G.bots.map(b=>b.type);
  const newG = initGame(types.length, types);
  newG.player.stack = G.player.stack;
  newG.bots.forEach((b,i)=>{ if(G.bots[i]) b.stack=G.bots[i].stack; });
  G = newG;
  renderGame();
  setTimeout(()=>{G.waitingForPlayer=true;renderActions();},1200);
};

window.endGame = function() {
  if (typeof window.saveCredits==='function') window.saveCredits(G?.player?.stack||500);
  document.getElementById('game-actions').innerHTML = `
    <button class="btn btn-primary" onclick="openPokerSetup()">New Game</button>
  `;
  document.getElementById('game-area').innerHTML = `
    <div style="text-align:center;padding:3rem;color:rgba(255,255,255,0.5)">
      <div style="font-size:3rem">♠</div>
      <div style="margin-top:0.5rem">Start a new game to play</div>
    </div>
  `;
  G = null;
};

// ── Setup Modal ────────────────────────────────
window.openPokerSetup = function() {
  document.getElementById('poker-setup-modal').classList.add('open');
};
window.closePokerSetup = function() {
  document.getElementById('poker-setup-modal').classList.remove('open');
};

window.startGame = function() {
  const count = parseInt(document.getElementById('bot-count').value||1);
  const types = [];
  for (let i=0;i<count;i++) {
    const sel = document.getElementById(`bot-type-${i}`);
    types.push(sel?sel.value:'TAG');
  }
  closePokerSetup();
  const credits = window.playerCredits || 500;
  const g = initGame(count, types);
  g.player.stack = credits;
  G = g;
  renderGame();
  setTimeout(()=>{G.waitingForPlayer=true;renderActions();},1400);
};

window.updateBotSelectors = function() {
  const count = parseInt(document.getElementById('bot-count').value||1);
  const el = document.getElementById('bot-type-selectors');
  if (!el) return;
  el.innerHTML = Array.from({length:count},(_,i)=>`
    <div style="margin-bottom:0.5rem">
      <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:3px">Bot ${i+1} style</label>
      <select id="bot-type-${i}" style="width:100%;padding:0.5rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);font-family:var(--font-body);font-size:0.875rem">
        <option value="TAG">🎯 TAG — Tight Aggressive</option>
        <option value="LAG">🔥 LAG — Loose Aggressive</option>
        <option value="Fish">🐟 Fish — Calling Station</option>
        <option value="Nit">🪨 Nit — Ultra Tight</option>
      </select>
    </div>
  `).join('');
};
