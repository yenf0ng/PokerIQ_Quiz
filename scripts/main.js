// ══════════════════════════════════════════════
//  PokerIQ — main.js
// ══════════════════════════════════════════════

const SECTIONS = ['hand-rankings','playstyle','odds-calc','pot-odds','positions','bluffing','bankroll','glossary'];

// ── Progress ────────────────────────────────────
function getProgress() {
  try { return JSON.parse(localStorage.getItem('pokeriq_progress')||'{}'); } catch(e) { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem('pokeriq_progress', JSON.stringify(p)); } catch(e) {}
}
function markSectionDone(id) {
  const p = getProgress(); p[id] = true; saveProgress(p); updateProgressUI();
  if (typeof window.onSectionMarkedComplete === 'function') window.onSectionMarkedComplete(id);
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
    const btn   = document.querySelector(`.mark-complete-btn[data-section="${id}"]`);
    if (check) { check.classList.toggle('done', !!p[id]); check.textContent = p[id] ? '✓' : ''; }
    if (btn)   { btn.classList.toggle('done', !!p[id]); btn.textContent = p[id] ? '✓ Completed' : '✓ Mark Complete'; }
  });
}
window.updateProgressUI = updateProgressUI;

// ── Navigation ──────────────────────────────────
function showSection(id) {
  document.querySelectorAll('.section-page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const page = document.getElementById('sec-' + id);
  const nav  = document.querySelector(`.nav-item[data-section="${id}"]`);
  if (page) page.classList.add('active');
  if (nav)  nav.classList.add('active');
  window.scrollTo(0, 0);
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.overlay')?.classList.remove('open');
}
window.showSection = showSection;

// ── Cert modal ──────────────────────────────────
window.openCertModal = function() {
  const p    = getProgress();
  const done = SECTIONS.filter(s => p[s]).length;
  if (done < SECTIONS.length) {
    alert('🔒 Certificate locked!\nComplete all 8 sections first.\nProgress: ' + done + '/8');
    return;
  }
  const modal = document.getElementById('cert-modal');
  if (modal) modal.classList.add('open');
  const name = document.getElementById('cert-name-input')?.value
    || localStorage.getItem('pokeriq_display_name')
    || window.currentUserName || 'Your Name';
  if (typeof drawCertificate === 'function') drawCertificate(name);
};
window.closeCertModal = function() {
  document.getElementById('cert-modal')?.classList.remove('open');
};

// ── Odds Calculator ─────────────────────────────
const CALC_RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const CALC_SUITS = [['♠','black'],['♥','red'],['♦','red'],['♣','black']];
const SUIT_NAMES = {'♠':'spades','♥':'hearts','♦':'diamonds','♣':'clubs'};

function makeCardEl(rank, suit, color) {
  const d = document.createElement('div');
  d.className = 'playing-card' + (color === 'red' ? ' red' : '');
  d.innerHTML = '<span class="rank">'+rank+suit+'</span><span class="suit-center">'+suit+'</span><span class="rank-bot">'+rank+suit+'</span>';
  return d;
}

let selectedSlot = null, pickedCards = {}, slotCards = {};

function initOddsCalc() {
  const holePicker  = document.getElementById('hole-picker');
  const boardPicker = document.getElementById('board-picker');
  if (!holePicker) return;
  const slotDefs = [{id:'hole1'},{id:'hole2'},{id:'flop1'},{id:'flop2'},{id:'flop3'},{id:'turn'},{id:'river'}];
  slotDefs.forEach(def => {
    const slot = document.createElement('div');
    slot.className = 'card-picker-slot';
    slot.dataset.slot = def.id;
    slot.innerHTML = '<span class="slot-plus">+</span>';
    slot.addEventListener('click', () => openCardModal(def.id, slot));
    (def.id.startsWith('hole') ? holePicker : boardPicker).appendChild(slot);
  });
  document.getElementById('calc-btn')?.addEventListener('click', calculateOdds);
  document.getElementById('clear-btn')?.addEventListener('click', clearCalc);
  const modal = document.getElementById('card-modal');
  document.getElementById('modal-close')?.addEventListener('click', () => modal?.classList.remove('open'));
  modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
}

function openCardModal(slotId, slotEl) {
  selectedSlot = {id: slotId, el: slotEl};
  const modal = document.getElementById('card-modal');
  const grid  = document.getElementById('modal-cards');
  if (!grid || !modal) return;
  grid.innerHTML = '';
  CALC_SUITS.forEach(([suit, color]) => {
    const sec = document.createElement('div');
    sec.className = 'suit-section';
    sec.innerHTML = '<div class="suit-label" style="color:'+(color==='red'?'var(--red)':'var(--text)')+'">'+suit+' '+SUIT_NAMES[suit]+'</div><div class="rank-buttons" id="rb-'+suit+'"></div>';
    grid.appendChild(sec);
    const rb = sec.querySelector('.rank-buttons');
    CALC_RANKS.forEach(rank => {
      const key = rank + suit;
      const btn = document.createElement('button');
      btn.className = 'rank-btn' + (color==='red'?' red-suit':'') + (pickedCards[key]?' used':'');
      btn.textContent = rank; btn.disabled = !!pickedCards[key];
      btn.addEventListener('click', () => selectCalcCard(rank, suit, color, key));
      rb.appendChild(btn);
    });
  });
  modal.classList.add('open');
}

function selectCalcCard(rank, suit, color, key) {
  if (pickedCards[key] || !selectedSlot) return;
  const {id, el} = selectedSlot;
  if (slotCards[id]) delete pickedCards[slotCards[id]];
  slotCards[id] = key; pickedCards[key] = true;
  el.innerHTML = '';
  el.appendChild(makeCardEl(rank, suit, color));
  const rm = document.createElement('span');
  rm.className = 'remove-card'; rm.textContent = '×';
  rm.addEventListener('click', e => { e.stopPropagation(); delete pickedCards[key]; delete slotCards[id]; el.innerHTML = '<span class="slot-plus">+</span>'; });
  el.appendChild(rm);
  document.getElementById('card-modal')?.classList.remove('open');
  selectedSlot = null;
}

function clearCalc() {
  pickedCards = {}; slotCards = {};
  document.querySelectorAll('.card-picker-slot').forEach(sl => sl.innerHTML = '<span class="slot-plus">+</span>');
  const res = document.getElementById('odds-result');
  if (res) res.style.display = 'none';
}

function buildDeckStr() {
  const d = [];
  CALC_SUITS.forEach(([s]) => CALC_RANKS.forEach(r => d.push(r+s)));
  return d;
}

function calcHandScore(cards) {
  const rs = cards.map(c => c.slice(0,-1));
  const ss = cards.map(c => c.slice(-1));
  const vs = rs.map(r => '23456789TJQKA'.indexOf(r)).sort((a,b) => b-a);
  const flush = ss.every(s => s===ss[0]);
  const straight = vs.every((v,i) => i===0||vs[i-1]-v===1) ||
    (vs[0]===12&&vs[1]===3&&vs[2]===2&&vs[3]===1&&vs[4]===0);
  const counts = {}; rs.forEach(r => counts[r]=(counts[r]||0)+1);
  const cv = Object.values(counts).sort((a,b) => b-a);
  if (flush&&straight&&vs[0]===12) return 9;
  if (flush&&straight) return 8;
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
    const five = cards.filter((_,k) => k!==i&&k!==j);
    best = Math.max(best, calcHandScore(five));
  }
  return best;
}

function mcShuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

function monteCarloEquity(hole, board, sims) {
  const deck = buildDeckStr().filter(c => ![...hole,...board].includes(c));
  let win=0,tie=0,lose=0;
  const needed = 5-board.length;
  for(let i=0;i<sims;i++){
    const sh=mcShuffle(deck);
    const comm=[...board,...sh.slice(0,needed)];
    const opp=sh.slice(needed,needed+2);
    const h=[...hole,...comm],v=[...opp,...comm];
    const hs=h.length>=7?bestOf7(h):calcHandScore(h.slice(0,5));
    const vs2=v.length>=7?bestOf7(v):calcHandScore(v.slice(0,5));
    if(hs>vs2)win++;else if(hs===vs2)tie++;else lose++;
  }
  return {win:(win/sims)*100,tie:(tie/sims)*100,lose:(lose/sims)*100};
}

function calculateOdds() {
  const hole=[slotCards['hole1'],slotCards['hole2']].filter(Boolean);
  if(hole.length<2){alert('Select both hole cards first.');return;}
  const board=['flop1','flop2','flop3','turn','river'].map(k=>slotCards[k]).filter(Boolean);
  const result=monteCarloEquity(hole,board,5000);
  const res=document.getElementById('odds-result');
  if(res)res.style.display='block';
  document.getElementById('equity-pct').textContent=result.win.toFixed(1)+'%';
  document.getElementById('tie-pct') && (document.getElementById('tie-pct').textContent=result.tie.toFixed(1)+'%');
  document.getElementById('lose-pct') && (document.getElementById('lose-pct').textContent=result.lose.toFixed(1)+'%');
  ['win','tie','lose'].forEach(k=>{
    const b=document.getElementById(k+'-bar');
    if(b)b.style.width=result[k].toFixed(1)+'%';
  });
}

// ── Pot Odds ────────────────────────────────────
function initPotOdds() {
  ['pot-size','bet-size','outs-input'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calcPotOdds);
  });
}
function calcPotOdds() {
  const pot  = parseFloat(document.getElementById('pot-size')?.value)||0;
  const bet  = parseFloat(document.getElementById('bet-size')?.value)||0;
  const outs = parseInt(document.getElementById('outs-input')?.value)||0;
  if(!pot||!bet) return;
  const potOdds=(bet/(pot+bet))*100;
  const equity=outs>0?(outs/47)*100:0;
  const podEl=document.getElementById('pot-odds-result');
  const eqEl=document.getElementById('equity-result');
  const decEl=document.getElementById('decision-result');
  if(podEl)podEl.textContent=potOdds.toFixed(1)+'%';
  if(eqEl)eqEl.textContent=outs>0?equity.toFixed(1)+'%':'—';
  if(decEl&&outs>0){
    decEl.style.display='inline-block';
    if(equity>potOdds){decEl.textContent='✓ Profitable call';decEl.className='decision-badge decision-call';}
    else if(equity>potOdds*0.8){decEl.textContent='⚠ Borderline';decEl.className='decision-badge decision-close';}
    else{decEl.textContent='✗ Fold is better';decEl.className='decision-badge decision-fold';}
  }
}

// ── Bankroll ────────────────────────────────────
function initBankroll() {
  document.getElementById('bankroll-input')?.addEventListener('input', calcBankroll);
}
function calcBankroll() {
  const br=parseFloat(document.getElementById('bankroll-input')?.value)||0;
  document.querySelectorAll('.stake-row').forEach(row=>{
    const needed=(parseFloat(row.dataset.buyin)||0)*20;
    row.style.background=br>=needed?'rgba(42,122,42,0.06)':'';
    const badge=row.querySelector('.ready-badge');
    if(badge){badge.textContent=br>=needed?'✓ Ready':'';badge.style.color='#2a7a2a';}
  });
}

// ── Positions ───────────────────────────────────
function initPositions() {
  document.querySelectorAll('.pos-card').forEach(card=>{
    card.addEventListener('click',()=>{
      document.querySelectorAll('.pos-card').forEach(c=>c.classList.remove('active'));
      document.querySelectorAll('.pos-detail').forEach(d=>d.classList.remove('active'));
      card.classList.add('active');
      document.getElementById('pos-'+card.dataset.pos)?.classList.add('active');
    });
  });
}

// ── Glossary ────────────────────────────────────
function initGlossary() {
  const search=document.getElementById('glossary-search');
  if(!search)return;
  search.addEventListener('input',()=>{
    const q=search.value.toLowerCase();
    document.querySelectorAll('.glossary-term').forEach(t=>t.classList.toggle('hidden',q.length>0&&!t.textContent.toLowerCase().includes(q)));
    document.querySelectorAll('.glossary-letter').forEach(letter=>{
      let el=letter.nextElementSibling,allHidden=true;
      while(el&&el.classList.contains('glossary-term')){if(!el.classList.contains('hidden'))allHidden=false;el=el.nextElementSibling;}
      letter.style.display=allHidden?'none':'';
    });
  });
}

// ── Quiz Engine ─────────────────────────────────
const quizData = {
  'hand-rankings': [
    {q:'Which hand ranks highest in poker?',opts:['Four of a Kind','Royal Flush','Straight Flush','Full House'],ans:1,exp:'Royal Flush (A-K-Q-J-T all same suit) is the best hand in poker.'},
    {q:'What beats a flush?',opts:['Two Pair','Straight','Full House','Three of a Kind'],ans:2,exp:'A Full House (three of a kind + a pair) beats a Flush.'},
    {q:'How many cards make a standard poker hand?',opts:['4','5','6','7'],ans:1,exp:'A poker hand consists of exactly 5 cards.'},
    {q:'What is "trips" in poker slang?',opts:['Two Pair','Straight','Full House','Three of a Kind'],ans:3,exp:'Trips means Three of a Kind — three cards of the same rank.'},
  ],
  'playstyle': [
    {q:'What does TAG stand for?',opts:['Tight Aggressive','Tight And Good','Total Ace Game','Turn And Go'],ans:0,exp:'TAG = Tight Aggressive. Play few hands, but bet and raise aggressively with strong ones.'},
    {q:'Which playstyle plays many hands but bets aggressively?',opts:['Nit','TAG','LAG','Fish'],ans:2,exp:'LAG (Loose Aggressive) plays many hands and uses aggression to pressure opponents.'},
    {q:'A "Nit" in poker is best described as:',opts:['A very loose player','An extremely tight passive player','A bluffing specialist','A GTO solver'],ans:1,exp:'Nits play very few hands and rarely bluff.'},
    {q:'What does GTO stand for?',opts:['Get The Odds','Game Theory Optimal','Good Turn Only','Guess The Opponent'],ans:1,exp:'GTO = Game Theory Optimal. A mathematically balanced strategy.'},
  ],
  'odds-calc': [
    {q:'How many outs does an open-ended straight draw have?',opts:['4','6','8','10'],ans:2,exp:'An open-ended straight draw has 8 outs — four cards on each end.'},
    {q:'With 9 outs on the flop, approximate chance of hitting by river?',opts:['18%','35%','50%','65%'],ans:1,exp:'9 outs × 4 (Rule of 4) ≈ 36%. About 35% is correct.'},
    {q:'The "Rule of 4 and 2" is used to:',opts:['Count cards','Estimate equity with outs','Calculate rake','Determine pot odds'],ans:1,exp:'Multiply outs by 4 on the flop or by 2 on the turn.'},
    {q:'A flush draw typically has how many outs?',opts:['7','9','11','13'],ans:1,exp:'A flush draw has 9 outs — 13 per suit minus 4 you hold.'},
  ],
  'pot-odds': [
    {q:'Pot is $100, opponent bets $50. What are your pot odds?',opts:['25%','33%','50%','66%'],ans:1,exp:'Pot is $150, call $50. 50/150 = 33%.'},
    {q:'Your equity is 35%, pot odds are 30%. Should you call?',opts:['Yes — equity beats pot odds','No — fold always','Only in position','Ask the dealer'],ans:0,exp:'If equity > pot odds, calling is profitable long-term.'},
    {q:'What does "equity" mean in poker?',opts:['The pot amount','Your % chance of winning','Your stack value','Your rakeback'],ans:1,exp:'Equity is your percentage chance of winning the hand.'},
    {q:'Which often matters more than raw pot odds?',opts:['Card suits','Table position','Implied odds','Stack colour'],ans:2,exp:'Implied odds account for future betting, making some calls more profitable.'},
  ],
  'positions': [
    {q:'Which position acts LAST post-flop?',opts:['UTG','Small Blind','Big Blind','Button (BTN)'],ans:3,exp:'The Button acts last on every post-flop street — the best seat.'},
    {q:'What does UTG stand for?',opts:['Under The Gun','Up The Grade','Usually The Grinder','Under The Goal'],ans:0,exp:'UTG is first to act pre-flop — the most disadvantaged position.'},
    {q:'Why is position so important?',opts:['See more cards','Act after opponents — gain info','Pay less rake','Get better hands'],ans:1,exp:'Acting after opponents gives you a huge informational advantage.'},
    {q:'Which position is directly right of the Button?',opts:['UTG','Big Blind','Cutoff (CO)','Small Blind'],ans:2,exp:'The Cutoff is directly right of the Button — second best position.'},
  ],
  'bluffing': [
    {q:'A "semi-bluff" is:',opts:['A bluff with no outs','Bluffing with a drawing hand','Bluffing the nuts','A min-bet bluff'],ans:1,exp:'A semi-bluff has two ways to win: fold now, or hit your draw.'},
    {q:'What is a "timing tell"?',opts:['Watching the clock','Pattern in how long someone takes to act','A physical gesture','Time of day'],ans:1,exp:'Hesitations or instant calls can reveal hand strength.'},
    {q:'Which sizing is most associated with bluffs?',opts:['Min-bet','50% pot','75% pot','Overbet (125%+)'],ans:3,exp:'Overbets maximise fold equity and put maximum pressure on opponents.'},
    {q:'"Polarized" range means:',opts:['Medium-strength hands','Nuts OR bluffs only','All bluffs','Never bluffing'],ans:1,exp:'A polarized range has only very strong hands or complete bluffs.'},
  ],
  'bankroll': [
    {q:'Standard cash game bankroll recommendation:',opts:['5 buy-ins','10 buy-ins','20 buy-ins','50 buy-ins'],ans:2,exp:'20 buy-ins is the minimum recommended for cash games.'},
    {q:'You lose 5 buy-ins in a session. What should you do?',opts:['Play higher','Play longer','Move down in stakes','Keep playing same'],ans:2,exp:'Moving down protects your bankroll. Never chase losses by moving up.'},
    {q:'Max % of bankroll per tournament entry:',opts:['1-2%','10%','25%','50%'],ans:0,exp:'Risk no more than 1-2% per tournament to survive variance.'},
    {q:'What is "shot-taking"?',opts:['Drinking during play','Playing higher stakes with extra funds','Bluffing more','Playing fewer hands'],ans:1,exp:'Shot-taking = playing one session at a higher stake, with a plan to drop back if it fails.'},
  ],
  'glossary': [
    {q:'What does "c-bet" mean?',opts:['Check-Bet','Continuation Bet','Cash Bet','Call-Back Bet'],ans:1,exp:'A continuation bet is when the pre-flop aggressor bets again on the flop.'},
    {q:'What is "the nuts"?',opts:['A bad hand','Average hand','The best possible hand','A pocket pair'],ans:2,exp:'"The nuts" = the absolute best possible hand given the board.'},
    {q:'What does "donk bet" mean?',opts:['A large bet','Betting into the pre-flop aggressor out of position','A min-bet','River bluff'],ans:1,exp:'A donk bet is non-standard — out-of-position player bets into the raiser.'},
    {q:'What is "rake"?',opts:['A bluffing move','% the house takes from each pot','A type of hand','The dealer button'],ans:1,exp:'Rake is the fee taken by the card room, typically 2-5%.'},
  ]
};

const quizState = {};
function initQuiz(sectionId) {
  if (!quizData[sectionId]) return;
  quizState[sectionId] = {current:0, answers:{}, submitted:{}};
  renderQuestion(sectionId);
}
function renderQuestion(sectionId) {
  const state=quizState[sectionId];
  const questions=quizData[sectionId];
  const q=questions[state.current];
  const wrap=document.getElementById('quiz-'+sectionId);
  if(!wrap||!q)return;
  wrap.querySelector('.quiz-progress-dots').innerHTML=questions.map((_,i)=>
    '<div class="q-dot '+(i<state.current?'done':i===state.current?'current':'')+'"></div>').join('');
  wrap.querySelector('.quiz-q').textContent='Q'+(state.current+1)+': '+q.q;
  wrap.querySelector('.quiz-options').innerHTML=q.opts.map((opt,i)=>
    '<button class="quiz-opt'+(state.submitted[state.current]?(i===q.ans?' correct':state.answers[state.current]===i?' wrong':'')+' disabled':'')+'" onclick="submitAnswer(\''+sectionId+'\','+i+')">'+opt+'</button>'
  ).join('');
  const fb=wrap.querySelector('.quiz-feedback');
  fb.textContent=q.exp; fb.classList.toggle('show',!!state.submitted[state.current]);
  const isLast=state.current===questions.length-1;
  const canNext=!!state.submitted[state.current];
  const banner=wrap.querySelector('.complete-banner');
  if(banner)banner.classList.remove('show');
  wrap.querySelector('.quiz-nav').innerHTML=
    '<span style="font-size:0.8rem;color:var(--text-light)">'+(state.current+1)+' of '+questions.length+'</span>'+
    (canNext&&!isLast?'<button class="btn btn-primary" onclick="nextQuestion(\''+sectionId+'\')">Next →</button>':'')+
    (canNext&&isLast?'<button class="btn btn-accent" onclick="showScore(\''+sectionId+'\')">See Results</button>':'');
}
function submitAnswer(sectionId, idx) {
  const state=quizState[sectionId];
  if(state.submitted[state.current])return;
  state.answers[state.current]=idx;
  state.submitted[state.current]=true;
  renderQuestion(sectionId);
}
function nextQuestion(sectionId) { quizState[sectionId].current++; renderQuestion(sectionId); }
function showScore(sectionId) {
  const state=quizState[sectionId];
  const questions=quizData[sectionId];
  const correct=questions.filter((q,i)=>state.answers[i]===q.ans).length;
  const wrap=document.getElementById('quiz-'+sectionId);
  const banner=wrap.querySelector('.complete-banner');
  wrap.querySelector('.score').textContent=correct+'/'+questions.length;
  if(banner)banner.classList.add('show');
  wrap.querySelector('.quiz-nav').innerHTML=
    '<button class="btn btn-secondary" onclick="restartQuiz(\''+sectionId+'\')">↺ Retry</button>'+
    '<span style="font-size:0.8rem;color:var(--text-muted)">'+(correct===questions.length?'🏆 Perfect!':correct>=questions.length/2?'Good job!':'Keep studying!')+'</span>';
  if(typeof window.addQuizScore==='function')window.addQuizScore(correct);
}
function restartQuiz(sectionId) {
  quizState[sectionId]={current:0,answers:{},submitted:{}};
  renderQuestion(sectionId);
}
window.submitAnswer=submitAnswer;
window.nextQuestion=nextQuestion;
window.showScore=showScore;
window.restartQuiz=restartQuiz;

// ── Hand Tester ─────────────────────────────────
const HAND_TYPES=['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush'];
let testerCards=[];
function initHandTester() {
  dealTesterHand();
  document.getElementById('tester-deal')?.addEventListener('click',dealTesterHand);
}
function dealTesterHand() {
  const deck=mcShuffle(buildDeckStr());
  testerCards=deck.slice(0,5);
  const container=document.getElementById('tester-cards');
  if(!container)return;
  container.innerHTML='';
  testerCards.forEach(c=>{
    const rank=c.slice(0,-1),suit=c.slice(-1);
    container.appendChild(makeCardEl(rank,suit,(suit==='♥'||suit==='♦')?'red':'black'));
  });
  document.querySelectorAll('.guess-btn').forEach(b=>{b.classList.remove('correct','wrong');b.disabled=false;});
  document.getElementById('tester-result')?.classList.remove('show');
}
window.guessHand=function(idx){
  const score=calcHandScore(testerCards);
  document.querySelectorAll('.guess-btn').forEach((b,i)=>{
    b.disabled=true;
    if(i===score)b.classList.add('correct');
    else if(i===idx&&idx!==score)b.classList.add('wrong');
  });
  const res=document.getElementById('tester-result');
  if(res){res.classList.add('show');res.innerHTML='<div class="tester-result-name">'+(idx===score?'✓ Correct! ':'✗ Wrong — it\'s a ')+HAND_TYPES[score]+'</div>';}
};

// ── Profile modal wiring ────────────────────────
function initProfileModal() {
  document.getElementById('save-profile-changes')?.addEventListener('click',()=>{
    const name=document.getElementById('profile-name-input')?.value?.trim();
    const avatar=document.getElementById('profile-avatar-input')?.value?.trim();
    const country=document.getElementById('profile-country-select')?.value;
    if(typeof window.updateUserProfileData==='function'){
      window.updateUserProfileData(name,avatar,country);
    } else {
      if(country)localStorage.setItem('pokeriq_country',country);
      if(name)localStorage.setItem('pokeriq_display_name',name);
      document.getElementById('profile-modal')?.classList.remove('open');
      if(typeof window.showToast==='function')window.showToast('Profile saved!');
    }
  });
}

// ── DOMContentLoaded ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Show first section immediately — this is the critical fix
  showSection('hand-rankings');
  updateProgressUI();
  initOddsCalc();
  initPotOdds();
  initBankroll();
  initPositions();
  initGlossary();
  initHandTester();
  SECTIONS.forEach(id => initQuiz(id));
  initProfileModal();

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if(item.dataset.section) showSection(item.dataset.section);
    });
  });
  document.querySelectorAll('.mark-complete-btn').forEach(btn => {
    btn.addEventListener('click', () => markSectionDone(btn.dataset.section));
  });
  document.querySelector('.menu-toggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('open');
    document.querySelector('.overlay')?.classList.toggle('open');
  });
  document.querySelector('.overlay')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.overlay')?.classList.remove('open');
  });
  document.addEventListener('keydown', e => {
    if(e.key==='Escape'){
      closeCertModal();
      document.getElementById('profile-modal')?.classList.remove('open');
    }
  });
});
