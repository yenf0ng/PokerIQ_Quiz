// ── Progress Tracker ──
const SECTIONS = ['hand-rankings','playstyle','odds-calc','pot-odds','positions','bluffing','bankroll','glossary'];
const SECTION_NAMES = ['Hand Rankings','Playstyle Types','Odds Calculator','Pot Odds & Equity','Positional Play','Bluffing & Reads','Bankroll Management','Glossary'];

function getProgress() {
  try { return JSON.parse(localStorage.getItem('pokeriq_progress') || '{}'); }
  catch(e) { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem('pokeriq_progress', JSON.stringify(p)); }
  catch(e) {}
}
function markSectionDone(id) {
  const p = getProgress(); p[id] = true; saveProgress(p); updateProgressUI();
  if (typeof window.onSectionMarkedComplete === 'function') {
    window.onSectionMarkedComplete(id);
  }
}
function updateProgressUI() {
  const p = getProgress();
  const done = SECTIONS.filter(s => p[s]).length;
  const pct = Math.round((done / SECTIONS.length) * 100);
  const fill = document.getElementById('topbar-fill');
  const pctEl = document.getElementById('topbar-pct');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  SECTIONS.forEach(id => {
    const check = document.querySelector(`.nav-check[data-section="${id}"]`);
    const btn = document.querySelector(`.mark-complete-btn[data-section="${id}"]`);
    if (check) { check.classList.toggle('done', !!p[id]); check.textContent = p[id] ? '✓' : ''; }
    if (btn) { btn.classList.toggle('done', !!p[id]); btn.textContent = p[id] ? '✓ Completed' : '✓ Mark Complete'; }
  });
}

// ── Navigation ──
function showSection(id) {
  document.querySelectorAll('.section-page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const page = document.getElementById('sec-' + id);
  const nav = document.querySelector(`.nav-item[data-section="${id}"]`);
  if (page) page.classList.add('active');
  if (nav) nav.classList.add('active');
  window.scrollTo(0, 0);
  closeSidebar();
}
function closeSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.overlay')?.classList.remove('open');
}

// ── Card Utilities (Renamed to avoid collision with game.js) ──
const CALC_RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const CALC_SUITS = [['♠','black'],['♥','red'],['♦','red'],['♣','black']];
const SUIT_NAMES = {'♠':'spades','♥':'hearts','♦':'diamonds','♣':'clubs'};

function makeCardEl(rank, suit, color) {
  const d = document.createElement('div');
  d.className = 'playing-card' + (color === 'red' ? ' red' : '');
  d.innerHTML = `<span class="rank">${rank}${suit}</span><span class="suit-center">${suit}</span><span class="rank-bot">${rank}${suit}</span>`;
  return d;
}

// ── Odds Calculator ──
let selectedSlot = null;
let pickedCards = {};
let slotCards = {};

function initOddsCalc() {
  const slotDefs = [
    {id:'hole1', label:'Hole 1'}, {id:'hole2', label:'Hole 2'},
    {id:'flop1', label:'Flop 1'}, {id:'flop2', label:'Flop 2'}, {id:'flop3', label:'Flop 3'},
    {id:'turn', label:'Turn'}, {id:'river', label:'River'}
  ];
  const holePicker = document.getElementById('hole-picker');
  const boardPicker = document.getElementById('board-picker');
  if (!holePicker) return;

  slotDefs.forEach(def => {
    const slot = document.createElement('div');
    slot.className = 'card-picker-slot';
    slot.dataset.slot = def.id;
    slot.innerHTML = `<span class="slot-plus">+</span>`;
    slot.addEventListener('click', () => openCardModal(def.id, slot));
    (def.id.startsWith('hole') ? holePicker : boardPicker).appendChild(slot);
  });

  document.getElementById('calc-btn').addEventListener('click', calculateOdds);
  document.getElementById('clear-btn').addEventListener('click', clearCalc);

  const modal = document.getElementById('card-modal');
  document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
}

function openCardModal(slotId, slotEl) {
  selectedSlot = {id: slotId, el: slotEl};
  const modal = document.getElementById('card-modal');
  const grid = document.getElementById('modal-cards');
  grid.innerHTML = '';
  CALC_SUITS.forEach(([suit, color]) => {
    const sec = document.createElement('div');
    sec.className = 'suit-section';
    sec.innerHTML = `<div class="suit-label" style="color:${color==='red'?'var(--red)':'var(--text)'}">${suit} ${SUIT_NAMES[suit]}</div><div class="rank-buttons" id="rb-${suit}"></div>`;
    grid.appendChild(sec);
    const rb = sec.querySelector('.rank-buttons');
    CALC_RANKS.forEach(rank => {
      const key = rank + suit;
      const btn = document.createElement('button');
      btn.className = 'rank-btn' + (color === 'red' ? ' red-suit' : '') + (pickedCards[key] ? ' used' : '');
      btn.textContent = rank;
      btn.title = key;
      btn.disabled = !!pickedCards[key];
      btn.addEventListener('click', () => selectCard(rank, suit, color, key));
      rb.appendChild(btn);
    });
  });
  modal.classList.add('open');
}

function selectCard(rank, suit, color, key) {
  if (pickedCards[key] || !selectedSlot) return;
  const {id, el} = selectedSlot;
  if (slotCards[id]) { delete pickedCards[slotCards[id]]; }
  slotCards[id] = key;
  pickedCards[key] = true;
  el.innerHTML = '';
  el.appendChild(makeCardEl(rank, suit, color));
  const rm = document.createElement('span');
  rm.className = 'remove-card';
  rm.textContent = '×';
  rm.addEventListener('click', e => { e.stopPropagation(); removeCard(id, el, key); });
  el.appendChild(rm);
  document.getElementById('card-modal').classList.remove('open');
  selectedSlot = null;
}

function removeCard(slotId, el, key) {
  delete pickedCards[key];
  delete slotCards[slotId];
  el.innerHTML = '<span class="slot-plus">+</span>';
}

function clearCalc() {
  pickedCards = {}; slotCards = {};
  document.querySelectorAll('.card-picker-slot').forEach(sl => { sl.innerHTML = '<span class="slot-plus">+</span>'; });
  document.getElementById('odds-result').style.display = 'none';
}

// Simple Monte Carlo poker equity estimation
function calculateOdds() {
  const hole = [slotCards['hole1'], slotCards['hole2']].filter(Boolean);
  if (hole.length < 2) { alert('Please select both hole cards first.'); return; }

  const board = ['flop1','flop2','flop3','turn','river'].map(k => slotCards[k]).filter(Boolean);
  const result = monteCarloEquity(hole, board, 5000);

  const resultEl = document.getElementById('odds-result');
  resultEl.style.display = 'block';
  document.getElementById('equity-pct').textContent = result.win.toFixed(1) + '%';
  document.getElementById('tie-pct').textContent = result.tie.toFixed(1) + '%';
  document.getElementById('lose-pct').textContent = result.lose.toFixed(1) + '%';

  ['win','tie','lose'].forEach(k => {
    const fill = document.getElementById(k + '-bar');
    if (fill) fill.style.width = result[k].toFixed(1) + '%';
  });

  const outs = estimateOuts(hole, board);
  document.getElementById('outs-info').textContent = outs > 0
    ? `Estimated ${outs} outs — ${boardOutsOdds(outs, 5 - board.length)} chance of hitting`
    : board.length >= 5 ? 'Final board — no more cards to come' : '';
}

function boardOutsOdds(outs, remaining) {
  if (remaining <= 0) return '0%';
  const pct = (1 - Math.pow((52-2-outs)/(52-2), remaining)) * 100;
  return pct.toFixed(1) + '%';
}

function estimateOuts(hole, board) {
  if (board.length < 3) return 0;
  const allCards = [...hole, ...board];
  const suits = {};
  const ranks = {};
  allCards.forEach(c => {
    const s = c.slice(-1); const r = c.slice(0,-1);
    suits[s] = (suits[s]||0)+1; ranks[r] = (ranks[r]||0)+1;
  });
  let outs = 0;
  Object.values(suits).forEach(cnt => { if (cnt === 4) outs += 9; });
  Object.values(ranks).forEach(cnt => { if (cnt === 3) outs += 1; if (cnt === 2) outs += 2; });
  return Math.min(outs, 21);
}

// Deck utilities
function internalBuildDeck() {
  const d = [];
  CALC_SUITS.forEach(([s]) => CALC_RANKS.forEach(r => d.push(r+s)));
  return d;
}

function handScore(cards) {
  const rs = cards.map(c=>c.slice(0,-1));
  const ss = cards.map(c=>c.slice(-1));
  const rankVal = r => '23456789TJQKA'.indexOf(r);
  const rvs = rs.map(rankVal).sort((a,b)=>b-a);
  const flush = ss.every(s=>s===ss[0]);
  const straight = rvs.every((v,i)=>i===0||rvs[i-1]-v===1) ||
    (rvs[0]===12&&rvs[1]===3&&rvs[2]===2&&rvs[3]===1&&rvs[4]===0);
  const counts = {}; rs.forEach(r=>counts[r]=(counts[r]||0)+1);
  const cv = Object.values(counts).sort((a,b)=>b-a);
  if (flush && straight && rvs[0]===12) return 9;
  if (flush && straight) return 8;
  if (cv[0]===4) return 7;
  if (cv[0]===3&&cv[1]===2) return 6;
  if (flush) return 5;
  if (straight) return 4;
  if (cv[0]===3) return 3;
  if (cv[0]===2&&cv[1]===2) return 2;
  if (cv[0]===2) return 1;
  return 0;
}

function bestOf7(cards) {
  let best = -1;
  for (let i=0;i<7;i++) for (let j=i+1;j<7;j++) {
    const five = cards.filter((_,k)=>k!==i&&k!==j);
    best = Math.max(best, handScore(five));
  }
  return best;
}

function monteCarloEquity(hole, board, sims) {
  const deck = internalBuildDeck().filter(c=>![...hole,...board].includes(c));
  let win=0,tie=0,lose=0;
  const needed = 5 - board.length;
  for (let i=0;i<sims;i++) {
    const shuffled = shuffle([...deck]);
    const community = [...board, ...shuffled.slice(0, needed)];
    const oppHole = shuffled.slice(needed, needed+2);
    const heroCards = [...hole, ...community];
    const villCards = [...oppHole, ...community];
    const heroScore = heroCards.length >= 7 ? bestOf7(heroCards) : handScore(heroCards.slice(0,5));
    const villScore = villCards.length >= 7 ? bestOf7(villCards) : handScore(villCards.slice(0,5));
    if (heroScore > villScore) win++;
    else if (heroScore === villScore) tie++;
    else lose++;
  }
  return {win:(win/sims)*100, tie:(tie/sims)*100, lose:(lose/sims)*100};
}

function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

// ── Pot Odds Calculator ──
function initPotOdds() {
  const potInput = document.getElementById('pot-size');
  const betInput = document.getElementById('bet-size');
  const outInput = document.getElementById('outs-input');
  if (!potInput) return;
  [potInput, betInput, outInput].forEach(el => el && el.addEventListener('input', calcPotOdds));
}

function calcPotOdds() {
  const pot = parseFloat(document.getElementById('pot-size').value)||0;
  const bet = parseFloat(document.getElementById('bet-size').value)||0;
  const outs = parseInt(document.getElementById('outs-input').value)||0;
  if (!pot || !bet) return;
  const totalPot = pot + bet;
  const potOdds = (bet / totalPot) * 100;
  const equity = outs > 0 ? (outs / 47) * 100 : 0;
  document.getElementById('pot-odds-result').textContent = potOdds.toFixed(1) + '%';
  document.getElementById('equity-result').textContent = outs > 0 ? equity.toFixed(1) + '%' : '—';
  const decEl = document.getElementById('decision-result');
  if (outs > 0) {
    if (equity > potOdds) { decEl.textContent = '✓ Profitable call'; decEl.className = 'decision-badge decision-call'; }
    else if (equity > potOdds * 0.8) { decEl.textContent = '⚠ Close — consider other factors'; decEl.className = 'decision-badge decision-close'; }
    else { decEl.textContent = '✗ Fold is better'; decEl.className = 'decision-badge decision-fold'; }
    decEl.style.display = 'inline-block';
  }
}

// ── Bankroll Calculator ──
function initBankroll() {
  const brInput = document.getElementById('bankroll-input');
  if (!brInput) return;
  brInput.addEventListener('input', calcBankroll);
}
function calcBankroll() {
  const br = parseFloat(document.getElementById('bankroll-input').value)||0;
  const rows = document.querySelectorAll('.stake-row');
  rows.forEach(row => {
    const buyin = parseFloat(row.dataset.buyin)||0;
    const needed = buyin * 20;
    const ready = br >= needed;
    row.style.background = ready ? 'rgba(42,122,42,0.06)' : '';
    const badge = row.querySelector('.ready-badge');
    if (badge) { badge.textContent = ready ? '✓ Ready' : ''; badge.style.color = '#2a7a2a'; }
  });
}

// ── Position Detail ──
function initPositions() {
  document.querySelectorAll('.pos-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.pos-card').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.pos-detail').forEach(d => d.classList.remove('active'));
      card.classList.add('active');
      const id = card.dataset.pos;
      const detail = document.getElementById('pos-' + id);
      if (detail) detail.classList.add('active');
    });
  });
}

// ── Glossary Search ──
function initGlossary() {
  const search = document.getElementById('glossary-search');
  if (!search) return;
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    document.querySelectorAll('.glossary-term').forEach(term => {
      const text = term.textContent.toLowerCase();
      term.classList.toggle('hidden', q.length > 0 && !text.includes(q));
    });
    document.querySelectorAll('.glossary-letter').forEach(letter => {
      const nextTerms = [];
      let el = letter.nextElementSibling;
      while (el && el.classList.contains('glossary-term')) { nextTerms.push(el); el = el.nextElementSibling; }
      letter.style.display = nextTerms.every(t => t.classList.contains('hidden')) ? 'none' : '';
    });
  });
}

// ── Quiz Engine ──
const quizData = {
  'hand-rankings': [
    { q: 'Which hand ranks highest in poker?', opts: ['Four of a Kind','Royal Flush','Straight Flush','Full House'], ans: 1, exp: 'Royal Flush (A-K-Q-J-T all same suit) is the best hand in poker.' },
    { q: 'What beats a flush?', opts: ['Two Pair','Straight','Full House','Three of a Kind'], ans: 2, exp: 'A Full House (three of a kind + a pair) beats a Flush.' },
    { q: 'How many cards make a standard poker hand?', opts: ['4','5','6','7'], ans: 1, exp: 'A poker hand consists of exactly 5 cards.' },
    { q: 'What is "trips" in poker slang?', opts: ['Two Pair','Straight','Full House','Three of a Kind'], ans: 3, exp: 'Trips means Three of a Kind — three cards of the same rank.' },
  ],
  'playstyle': [
    { q: 'What does TAG stand for?', opts: ['Tight Aggressive','Tight And Good','Total Ace Game','Turn And Go'], ans: 0, exp: 'TAG = Tight Aggressive. Play few hands, but bet and raise aggressively with strong ones.' },
    { q: 'Which playstyle plays many hands but bets aggressively?', opts: ['Nit','TAG','LAG','Fish'], ans: 2, exp: 'LAG (Loose Aggressive) plays many hands and uses aggression to pressure opponents.' },
    { q: 'A "Nit" in poker is best described as:', opts: ['A very loose player','An extremely tight, passive player','A bluffing specialist','A GTO solver'], ans: 1, exp: 'Nits play very few hands and rarely bluff — they\'re overly tight and passive.' },
    { q: 'What does GTO stand for?', opts: ['Get The Odds','Game Theory Optimal','Good Turn Only','Guess The Opponent'], ans: 1, exp: 'GTO = Game Theory Optimal. A balanced strategy that cannot be exploited.' },
  ],
  'odds-calc': [
    { q: 'How many outs does an open-ended straight draw have?', opts: ['4','6','8','10'], ans: 2, exp: 'An open-ended straight draw (e.g. 5-6-7-8) has 8 outs — four cards on each end.' },
    { q: 'With 9 outs on the flop, what is the approximate chance of hitting by the river?', opts: ['18%','35%','50%','65%'], ans: 1, exp: 'With 9 outs on the flop: roughly 9×4 = 36%, so about 35% is correct.' },
    { q: 'The "Rule of 4 and 2" is used to:', opts: ['Count cards','Estimate equity with outs','Calculate rake','Determine pot odds'], ans: 1, exp: 'Rule of 4 and 2: multiply outs by 4 on the flop (two cards to come) or by 2 on the turn.' },
    { q: 'A flush draw typically has how many outs?', opts: ['7','9','11','13'], ans: 1, exp: 'A flush draw has 9 outs — 13 cards per suit minus the 4 you already hold.' },
  ]
};

const quizState = {};
function initQuiz(sectionId) {
  const questions = quizData[sectionId];
  if (!questions) return;
  quizState[sectionId] = { current: 0, answers: {}, submitted: {} };
  renderQuestion(sectionId);
}
function renderQuestion(sectionId) {
  const state = quizState[sectionId];
  const questions = quizData[sectionId];
  const q = questions[state.current];
  const wrap = document.getElementById(`quiz-${sectionId}`);
  if (!wrap || !q) return;
  const dots = wrap.querySelector('.quiz-progress-dots');
  const qEl = wrap.querySelector('.quiz-q');
  const optsEl = wrap.querySelector('.quiz-options');
  const fb = wrap.querySelector('.quiz-feedback');
  const nav = wrap.querySelector('.quiz-nav');
  const banner = wrap.querySelector('.complete-banner');
  if (banner) banner.classList.remove('show');
  if (dots) {
    dots.innerHTML = questions.map((_, i) => `<div class="q-dot ${i < state.current ? 'done' : i === state.current ? 'current' : ''}"></div>`).join('');
  }
  if (qEl) qEl.textContent = `Q${state.current+1}: ${q.q}`;
  if (optsEl) {
    optsEl.innerHTML = q.opts.map((opt, i) =>
      `<button class="quiz-opt${state.submitted[state.current] ? (i===q.ans?' correct':state.answers[state.current]===i?' wrong':'')+' disabled':''}" onclick="submitAnswer('${sectionId}',${i})">${opt}</button>`
    ).join('');
  }
  if (fb) { fb.textContent = q.exp; fb.classList.toggle('show', !!state.submitted[state.current]); }
  if (nav) {
    const isLast = state.current === questions.length - 1;
    const canNext = !!state.submitted[state.current];
    nav.innerHTML = `
      <span style="font-size:0.8rem;color:var(--text-light)">${state.current+1} of ${questions.length}</span>
      ${canNext && !isLast ? `<button class="btn btn-primary" onclick="nextQuestion('${sectionId}')">Next →</button>` : ''}
      ${canNext && isLast ? `<button class="btn btn-accent" onclick="showScore('${sectionId}')">See Results</button>` : ''}
    `;
  }
}
function submitAnswer(sectionId, idx) {
  const state = quizState[sectionId];
  if (state.submitted[state.current]) return;
  state.answers[state.current] = idx;
  state.submitted[state.current] = true;
  renderQuestion(sectionId);
}
function nextQuestion(sectionId) {
  const state = quizState[sectionId];
  state.current++;
  renderQuestion(sectionId);
}
function showScore(sectionId) {
  const state = quizState[sectionId];
  const questions = quizData[sectionId];
  const correct = questions.filter((q,i) => state.answers[i] === q.ans).length;
  const wrap = document.getElementById(`quiz-${sectionId}`);
  const banner = wrap.querySelector('.complete-banner');
  const scoreEl = wrap.querySelector('.score');
  if (scoreEl) scoreEl.textContent = correct + '/' + questions.length;
  if (banner) banner.classList.add('show');
  const nav = wrap.querySelector('.quiz-nav');
  if (nav) nav.innerHTML = `<button class="btn btn-secondary" onclick="restartQuiz('${sectionId}')">↺ Retry</button><span style="font-size:0.8rem;color:var(--text-muted)">${correct === questions.length ? '🏆 Perfect score!' : correct >= questions.length/2 ? 'Good job!' : 'Keep studying!'}</span>`;
}
function restartQuiz(sectionId) {
  quizState[sectionId] = { current: 0, answers: {}, submitted: {} };
  renderQuestion(sectionId);
}

// ── Hand Strength Tester ──
const HAND_TYPES = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush'];
let testerCards = [];
function initHandTester() {
  dealTesterHand();
  document.getElementById('tester-deal')?.addEventListener('click', dealTesterHand);
}
function dealTesterHand() {
  const deck = internalBuildDeck();
  shuffle(deck);
  testerCards = deck.slice(0,5);
  const container = document.getElementById('tester-cards');
  if (!container) return;
  container.innerHTML = '';
  testerCards.forEach(c => {
    const rank = c.slice(0,-1), suit = c.slice(-1);
    const color = (suit==='♥'||suit==='♦') ? 'red' : 'black';
    container.appendChild(makeCardEl(rank, suit, color));
  });
  document.querySelectorAll('.guess-btn').forEach(b => { b.classList.remove('correct','wrong'); b.disabled = false; });
  const resultEl = document.getElementById('tester-result');
  if (resultEl) resultEl.classList.remove('show');
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  showSection('hand-rankings');
  updateProgressUI();
  initOddsCalc();
  initPotOdds();
  initBankroll();
  initPositions();
  initGlossary();
  initHandTester();
  SECTIONS.forEach(id => initQuiz(id));

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => showSection(item.dataset.section));
  });

  document.querySelectorAll('.mark-complete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      markSectionDone(btn.dataset.section);
      btn.textContent = '✓ Completed';
      btn.classList.add('done');
    });
  });

  document.querySelector('.menu-toggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
    document.querySelector('.overlay').classList.toggle('open');
  });
  document.querySelector('.overlay')?.addEventListener('click', closeSidebar);

  // ── Profile Modification Listener ──
  document.getElementById('save-profile-changes')?.addEventListener('click', () => {
    const name = document.getElementById('profile-name-input').value;
    const avatar = document.getElementById('profile-avatar-input').value;
    const country = document.getElementById('profile-country-select').value;
    
    if (typeof window.updateUserProfileData === 'function') {
      window.updateUserProfileData(name, avatar, country);
    } else {
      // Fallback if running entirely without Firebase initialization config
      localStorage.setItem('pokeriq_country', country);
      alert("Saved details locally (Firebase unconfigured).");
      document.getElementById('profile-modal').classList.remove('open');
    }
  });
});