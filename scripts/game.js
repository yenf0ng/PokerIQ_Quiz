// ══════════════════════════════════════════════
//  PokerIQ — Poker Game Engine v2 (fixed)
// ══════════════════════════════════════════════

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS_LIST = ['♠','♥','♦','♣'];
const RANK_VAL = {};
RANKS.forEach((r,i) => RANK_VAL[r] = i);

function buildDeck() {
  const d = [];
  SUITS_LIST.forEach(s => RANKS.forEach(r => d.push({r,s})));
  return gameShuffle(d);
}
function gameShuffle(arr) {
  const a = [...arr];
  for (let i=a.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function isRed(c) { return c.s==='♥'||c.s==='♦'; }

// ── Hand Evaluator ──────────────────────────────
function getCombos(arr, k) {
  if (k===arr.length) return [[...arr]];
  if (k===1) return arr.map(x=>[x]);
  const result = [];
  for (let i=0;i<=arr.length-k;i++) {
    getCombos(arr.slice(i+1), k-1).forEach(c => result.push([arr[i],...c]));
  }
  return result;
}

function scoreHand5(cards) {
  const rs = cards.map(c=>c.r);
  const ss = cards.map(c=>c.s);
  const vs = rs.map(r=>RANK_VAL[r]).sort((a,b)=>b-a);
  const isFlush = ss.every(s=>s===ss[0]);
  const isStraight = vs.every((v,i)=>i===0||vs[i-1]-v===1) ||
    (vs[0]===12&&vs[1]===3&&vs[2]===2&&vs[3]===1&&vs[4]===0);
  const freq = {};
  rs.forEach(r=>freq[r]=(freq[r]||0)+1);
  const counts = Object.values(freq).sort((a,b)=>b-a);
  const NAMES = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];
  let score;
  if (isFlush&&isStraight&&vs[0]===12) score=9;
  else if (isFlush&&isStraight) score=8;
  else if (counts[0]===4) score=7;
  else if (counts[0]===3&&counts[1]===2) score=6;
  else if (isFlush) score=5;
  else if (isStraight) score=4;
  else if (counts[0]===3) score=3;
  else if (counts[0]===2&&counts[1]===2) score=2;
  else if (counts[0]===2) score=1;
  else score=0;
  return {score, name:NAMES[score], tiebreak:vs};
}

function evalBest(cards) {
  if (cards.length < 5) {
    const dummy = cards.concat(Array(5-cards.length).fill({r:'2',s:'♠'}));
    return scoreHand5(dummy);
  }
  let best = {score:-1};
  getCombos(cards,5).forEach(combo => {
    const res = scoreHand5(combo);
    if (res.score > best.score || (res.score===best.score && compareTB(res.tiebreak, best.tiebreak))) best=res;
  });
  return best;
}

function compareTB(a,b) {
  if (!b) return true;
  for (let i=0;i<Math.min(a.length,b.length);i++) {
    if (a[i]>b[i]) return true;
    if (a[i]<b[i]) return false;
  }
  return false;
}

// ── Bot AI ──────────────────────────────────────
const BOT_CONFIGS = {
  TAG:  {name:'TAG',  emoji:'🎯', label:'Tight Aggressive'},
  LAG:  {name:'LAG',  emoji:'🔥', label:'Loose Aggressive'},
  Fish: {name:'Fish', emoji:'🐟', label:'Calling Station'},
  Nit:  {name:'Nit',  emoji:'🪨', label:'Ultra Tight'}
};

function preflopStrength(hole) {
  const v0=RANK_VAL[hole[0].r], v1=RANK_VAL[hole[1].r];
  const hi=Math.max(v0,v1), lo=Math.min(v0,v1);
  const paired=hole[0].r===hole[1].r;
  const suited=hole[0].s===hole[1].s;
  if (paired&&hi>=10) return 8;
  if (paired&&hi>=6)  return 5;
  if (paired)         return 3;
  if (hi===12&&lo>=9) return 7;
  if (hi>=10&&lo>=8&&suited) return 6;
  if (hi>=10&&lo>=8)  return 5;
  if (hi>=9&&suited)  return 4;
  if (hi>=9)          return 3;
  if (suited)         return 2;
  return 1;
}

function botDecide(bot, hs, pot, toCall, stack) {
  const r = Math.random();
  const potOdds = pot>0 ? toCall/(pot+toCall) : 0;
  switch(bot.type) {
    case 'TAG':
      if (hs>=6) return {action:'raise', amount:Math.max(pot, toCall*2)};
      if (hs>=3&&potOdds<0.4) return {action:'call'};
      if (hs>=2&&toCall===0)  return {action:'check'};
      return {action:'fold'};
    case 'LAG':
      if (hs>=5) return {action:'raise', amount:Math.floor(pot*0.75)||toCall*2};
      if (r<0.3) return {action:'raise', amount:Math.floor(pot*0.4)||toCall*2};
      if (hs>=2||r<0.6) return toCall===0?{action:'check'}:{action:'call'};
      return {action:'fold'};
    case 'Fish':
      if (hs>=7) return {action:'raise', amount:Math.floor(pot*0.5)||toCall*2};
      return toCall===0?{action:'check'}:{action:'call'};
    case 'Nit':
      if (hs>=7) return {action:'raise', amount:pot||toCall*2};
      if (hs>=5&&potOdds<0.2) return {action:'call'};
      return toCall===0?{action:'check'}:{action:'fold'};
    default:
      return toCall===0?{action:'check'}:{action:'fold'};
  }
}

// ── Game State ──────────────────────────────────
let GAME = null;

window.initGame = function(botTypes) {
  const deck = buildDeck();
  const bots = botTypes.map((type,i)=>({
    id:'bot'+i, type,
    name: BOT_CONFIGS[type].emoji+' '+BOT_CONFIGS[type].label,
    stack:500, hole:[], folded:false, bet:0, allIn:false, handResult:null
  }));
  GAME = {
    deck, bots,
    player:{id:'player',stack:window.playerCredits||500,hole:[],folded:false,bet:0,allIn:false,handResult:null},
    board:[], pot:0, stage:'preflop',
    SB:10, BB:20, lastRaise:20,
    log:[], handOver:false, waitingForPlayer:false, result:null
  };
  dealAll();
  postBlinds();
  gameRender();
  setTimeout(()=>{GAME.waitingForPlayer=true; renderActions();},1000);
};

function dealAll() {
  GAME.player.hole=[GAME.deck.pop(),GAME.deck.pop()];
  GAME.bots.forEach(b=>b.hole=[GAME.deck.pop(),GAME.deck.pop()]);
}

function postBlinds() {
  const sb=GAME.bots[0];
  const bb=GAME.bots.length>1?GAME.bots[1]:GAME.player;
  applyBet(sb,GAME.SB); GAME.pot+=GAME.SB;
  applyBet(bb,GAME.BB); GAME.pot+=GAME.BB;
  addLog(`${sb.name} posts SB ${GAME.SB} • ${bb.name} posts BB ${GAME.BB}`);
}

function applyBet(actor,amt) {
  const actual=Math.min(amt,actor.stack);
  actor.stack-=actual; actor.bet+=actual;
  if(actor.stack===0) actor.allIn=true;
  return actual;
}

function getToCall(actor) {
  const maxBet=Math.max(GAME.player.bet,...GAME.bots.map(b=>b.bet));
  return Math.max(0,maxBet-actor.bet);
}

function addLog(msg) { GAME.log.unshift(msg); if(GAME.log.length>10) GAME.log.pop(); }

// ── Player actions ──────────────────────────────
window.playerAction = function(action, raiseAmt) {
  if(!GAME||GAME.handOver||!GAME.waitingForPlayer) return;
  GAME.waitingForPlayer=false;
  const toCall=getToCall(GAME.player);

  if(action==='fold') {
    GAME.player.folded=true; addLog('You fold');
  } else if(action==='check'&&toCall===0) {
    addLog('You check');
  } else if(action==='call') {
    const a=applyBet(GAME.player,toCall); GAME.pot+=a; addLog(`You call ${a}`);
  } else if(action==='raise') {
    const total=toCall+(raiseAmt||GAME.BB*2);
    const a=applyBet(GAME.player,total); GAME.pot+=a;
    GAME.lastRaise=raiseAmt||GAME.BB*2;
    addLog(`You raise → ${GAME.player.bet}`);
  } else if(action==='allin') {
    const a=applyBet(GAME.player,GAME.player.stack); GAME.pot+=a;
    addLog(`You ALL-IN (${a})`);
  }

  gameRender();
  setTimeout(doBotActions, 700);
};

window.showRaiseSlider = function() {
  const el=document.getElementById('raise-panel');
  if(el) el.style.display=el.style.display==='none'?'block':'none';
};
window.confirmRaise = function() {
  const v=parseInt(document.getElementById('raise-slider')?.value||GAME.BB*2);
  playerAction('raise',v);
};

// ── Bot turn ────────────────────────────────────
function doBotActions() {
  const active=GAME.bots.filter(b=>!b.folded&&!b.allIn);
  let i=0;
  function next() {
    if(i>=active.length){advanceStreet();return;}
    const bot=active[i++];
    if(bot.folded){next();return;}
    const allC=[...bot.hole,...GAME.board];
    const hs=GAME.board.length>=3?evalBest(allC).score:preflopStrength(bot.hole);
    const toCall=getToCall(bot);
    const dec=botDecide(bot,hs,GAME.pot,toCall,bot.stack);

    if(dec.action==='fold'){bot.folded=true;addLog(`${bot.name} folds`);}
    else if(dec.action==='check'){addLog(`${bot.name} checks`);}
    else if(dec.action==='call'){const a=applyBet(bot,toCall);GAME.pot+=a;addLog(`${bot.name} calls ${a}`);}
    else if(dec.action==='raise'){
      const total=getToCall(bot)+(dec.amount||GAME.BB*2);
      const a=applyBet(bot,total);GAME.pot+=a;
      addLog(`${bot.name} raises → ${bot.bet}`);
    }
    gameRender();
    setTimeout(next,800);
  }
  next();
}

// ── Street logic ────────────────────────────────
function advanceStreet() {
  const alive=[GAME.player,...GAME.bots].filter(p=>!p.folded);
  if(alive.length===1){awardPot(alive[0]);return;}

  [GAME.player,...GAME.bots].forEach(p=>p.bet=0);

  if(GAME.stage==='preflop'){
    GAME.stage='flop';
    GAME.board=[GAME.deck.pop(),GAME.deck.pop(),GAME.deck.pop()];
    addLog('━━ Flop ━━');
  } else if(GAME.stage==='flop'){
    GAME.stage='turn';
    GAME.board.push(GAME.deck.pop());
    addLog('━━ Turn ━━');
  } else if(GAME.stage==='turn'){
    GAME.stage='river';
    GAME.board.push(GAME.deck.pop());
    addLog('━━ River ━━');
  } else {
    doShowdown(); return;
  }

  gameRender();
  GAME.waitingForPlayer=true;
  renderActions();
}

// ── Showdown ────────────────────────────────────
function doShowdown() {
  GAME.stage='showdown';
  const alive=[GAME.player,...GAME.bots].filter(p=>!p.folded);
  let winner=null, best=-1;
  alive.forEach(p=>{
    const res=evalBest([...p.hole,...GAME.board]);
    p.handResult=res;
    if(res.score>best||(res.score===best&&compareTB(res.tiebreak,winner?.handResult?.tiebreak))){
      best=res.score; winner=p;
    }
  });
  awardPot(winner);
}

function awardPot(winner) {
  winner.stack+=GAME.pot;
  GAME.result={winner,pot:GAME.pot};
  GAME.handOver=true;
  addLog(`🏆 ${winner.id==='player'?'You win':''+winner.name+' wins'} ${GAME.pot} cr!`);
  if(window.saveCredits) window.saveCredits(GAME.player.stack);
  if(typeof window.trackBotGame==='function') {
    window.trackBotGame(
      GAME.result.winner.id==='player',
      GAME.pot,
      GAME.bots.map(b=>b.type),
      GAME.player.handResult?.name||''
    );
  }
  gameRender();
  renderResult();
}

// ── Render ──────────────────────────────────────
function gameRender() {
  const el=document.getElementById('game-area');
  if(!el||!GAME) return;

  const boardHTML=GAME.board.length
    ? GAME.board.map(c=>`<div class="pc ${isRed(c)?'red':''}">${c.r}<span>${c.s}</span></div>`).join('')
    : `<div style="color:rgba(255,255,255,0.25);font-size:0.8rem">Waiting for flop…</div>`;

  const botsHTML=GAME.bots.map(b=>`
    <div class="bot-seat${b.folded?' folded':''}">
      <div style="font-size:1.3rem">${b.type?BOT_CONFIGS[b.type]?.emoji||'🤖':'🤖'}</div>
      <div style="flex:1;min-width:0">
        <div class="bot-name">${b.name}</div>
        <div class="bot-stack">${b.stack} cr${b.allIn?' · ALL-IN':''}</div>
      </div>
      <div class="bot-cards">
        ${GAME.stage==='showdown'&&!b.folded
          ? b.hole.map(c=>`<div class="pc sm ${isRed(c)?'red':''}">${c.r}<span>${c.s}</span></div>`).join('')
          : '<div class="pc sm back">♠</div><div class="pc sm back">♠</div>'}
      </div>
      ${b.folded?'<span class="fold-badge">FOLD</span>':''}
      ${b.handResult&&GAME.stage==='showdown'?`<div class="hand-badge">${b.handResult.name}</div>`:''}
    </div>`).join('');

  const pCards=GAME.player.hole.map(c=>
    `<div class="pc lg ${isRed(c)?'red':''}">${c.r}<span>${c.s}</span></div>`).join('');

  el.innerHTML=`
    <div class="game-table">
      <div class="bots-row">${botsHTML}</div>
      <div class="board-area">
        <div class="pot-display">Pot: ${GAME.pot} credits</div>
        <div class="board-cards">${boardHTML}</div>
        <div class="stage-badge">${GAME.stage.toUpperCase()}</div>
      </div>
      <div class="player-area">
        <div class="player-cards">${pCards}</div>
        <div class="player-meta">
          <span class="player-label">You</span>
          <span class="player-stack">${GAME.player.stack} cr</span>
          ${GAME.player.folded?'<span class="fold-badge">FOLD</span>':''}
          ${GAME.player.allIn?'<span class="allin-badge">ALL-IN</span>':''}
          ${GAME.player.handResult&&GAME.stage==='showdown'?`<span class="hand-badge">${GAME.player.handResult.name}</span>`:''}
        </div>
      </div>
    </div>
    <div class="action-log">${GAME.log.slice(0,6).map(l=>`<div class="log-line">${l}</div>`).join('')}</div>`;
}

function renderActions() {
  const el=document.getElementById('game-actions');
  if(!el||!GAME||GAME.handOver) return;
  const toCall=getToCall(GAME.player);
  const canCheck=toCall===0;
  const minRaise=Math.min(GAME.BB*2,GAME.player.stack);
  el.innerHTML=`
    <div class="action-btns">
      <button class="abtn fold"  onclick="playerAction('fold')">Fold</button>
      ${canCheck
        ?`<button class="abtn check" onclick="playerAction('check')">Check</button>`
        :`<button class="abtn call"  onclick="playerAction('call')">Call ${toCall}</button>`}
      ${GAME.player.stack>toCall
        ?`<button class="abtn raise" onclick="showRaiseSlider()">Raise ▾</button>`:''}
      <button class="abtn allin" onclick="playerAction('allin')">All-In ${GAME.player.stack}</button>
    </div>
    <div id="raise-panel" style="display:none;margin-top:0.75rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <input type="range" id="raise-slider" min="${minRaise}" max="${GAME.player.stack}" step="${GAME.BB}" value="${minRaise}" style="flex:1" oninput="document.getElementById('raise-val').textContent=this.value+' cr'">
        <span id="raise-val" style="font-size:0.85rem;color:var(--accent);font-weight:600;min-width:60px">${minRaise} cr</span>
        <button class="abtn raise" onclick="confirmRaise()">Confirm</button>
      </div>
    </div>`;
}

function renderResult() {
  const el=document.getElementById('game-actions');
  if(!el||!GAME?.result) return;
  const won=GAME.result.winner.id==='player';
  el.innerHTML=`
    <div class="result-banner ${won?'win':'lose'}">
      <div class="result-title">${won?'🏆 You Win!':'💀 You Lose'}</div>
      <div class="result-sub">${GAME.result.winner.id==='player'?'You win':''+GAME.result.winner.name+' wins'} ${GAME.result.pot} credits${GAME.player.handResult?' · '+GAME.player.handResult.name:''}</div>
    </div>
    <div style="display:flex;gap:0.75rem;margin-top:1rem;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="nextHand()">Next Hand ▶</button>
      <button class="btn btn-secondary" onclick="leaveTable()">Leave Table</button>
    </div>`;
}

window.nextHand = function() {
  if(!GAME) return;
  GAME.bots=GAME.bots.filter(b=>b.stack>0);
  if(!GAME.bots.length){leaveTable();return;}
  if(GAME.player.stack<=0){GAME.player.stack=100;addLog('Rebuy: +100 credits');}
  const types=GAME.bots.map(b=>b.type);
  window.initGame(types);
};

window.leaveTable = function() {
  if(window.saveCredits&&GAME) window.saveCredits(GAME.player.stack);
  GAME=null;
  document.getElementById('game-area').innerHTML=`
    <div style="text-align:center;padding:3rem;color:rgba(255,255,255,0.35);flex-direction:column;display:flex;align-items:center;gap:0.75rem">
      <div style="font-size:3rem">♠</div>
      <div>Start a game to play</div>
      <button class="btn btn-accent" onclick="openPokerSetup()" style="margin-top:0.25rem">Start Game</button>
    </div>`;
  document.getElementById('game-actions').innerHTML='';
};

// ── Setup modal ─────────────────────────────────
window.openPokerSetup = function() {
  document.getElementById('poker-setup-modal').classList.add('open');
  updateBotSelectors();
  const cm=document.getElementById('credits-display-modal');
  if(cm) cm.textContent=(window.playerCredits||500)+' cr';
};
window.closePokerSetup = function() {
  document.getElementById('poker-setup-modal').classList.remove('open');
};
window.startGame = function() {
  const count=parseInt(document.getElementById('bot-count')?.value||1);
  const types=[];
  for(let i=0;i<count;i++){
    const s=document.getElementById('bot-type-'+i);
    types.push(s?s.value:'TAG');
  }
  closePokerSetup();
  window.initGame(types);
};
window.updateBotSelectors = function() {
  const count=parseInt(document.getElementById('bot-count')?.value||1);
  const el=document.getElementById('bot-type-selectors');
  if(!el) return;
  el.innerHTML=Array.from({length:count},(_,i)=>`
    <div style="margin-bottom:0.5rem">
      <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:3px">Bot ${i+1} personality</label>
      <select id="bot-type-${i}" style="width:100%;padding:0.5rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:0.875rem">
        <option value="TAG">🎯 TAG — Tight Aggressive</option>
        <option value="LAG">🔥 LAG — Loose Aggressive</option>
        <option value="Fish">🐟 Fish — Calling Station</option>
        <option value="Nit">🪨 Nit — Ultra Tight</option>
      </select>
    </div>`).join('');
};
