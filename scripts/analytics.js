// ══════════════════════════════════════════════
//  PokerIQ — Analytics Dashboard
// ══════════════════════════════════════════════

// ── Track quiz attempt ─────────────────────────
window.trackQuizAttempt = async function(sectionId, correct, total) {
  const entry = {
    sectionId, correct, total,
    pct: Math.round((correct/total)*100),
    ts: Date.now()
  };
  // Save locally
  const key = 'pokeriq_analytics';
  try {
    const existing = JSON.parse(localStorage.getItem(key)||'[]');
    existing.push(entry);
    localStorage.setItem(key, JSON.stringify(existing.slice(-200)));
  } catch(e) {}
  // Save to Firestore
  if (window._db && window.currentUserId) {
    try {
      const {doc, setDoc, serverTimestamp} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const uid = window.currentUserId;
      const ref = doc(window._db, 'analytics', uid);
      const attempts = JSON.parse(localStorage.getItem('pokeriq_analytics')||'[]');
      await setDoc(ref, { attempts, updatedAt: serverTimestamp() }, {merge:true});
    } catch(e) { console.warn('Analytics push:', e.message); }
  }
};

// ── Track bot game result ──────────────────────
window.trackBotGame = function(won, pot, botTypes, handResult) {
  const entry = { won, pot, botTypes, handResult: handResult||'', ts: Date.now() };
  try {
    const key = 'pokeriq_bot_games';
    const existing = JSON.parse(localStorage.getItem(key)||'[]');
    existing.push(entry);
    localStorage.setItem(key, JSON.stringify(existing.slice(-500)));
  } catch(e) {}
};

// ── Render analytics dashboard ─────────────────
window.renderAnalytics = function() {
  const el = document.getElementById('analytics-content');
  if (!el) return;

  const attempts  = JSON.parse(localStorage.getItem('pokeriq_analytics')||'[]');
  const botGames  = JSON.parse(localStorage.getItem('pokeriq_bot_games')||'[]');
  const progress  = JSON.parse(localStorage.getItem('pokeriq_progress')||'{}');
  const credits   = parseInt(localStorage.getItem('pokeriq_credits')||'500');

  const SECTIONS = ['hand-rankings','playstyle','odds-calc','pot-odds','positions','bluffing','bankroll','glossary'];
  const LABELS   = ['Hand Rankings','Playstyle','Odds Calc','Pot Odds','Positions','Bluffing','Bankroll','Glossary'];

  // ── Skill scores per section ──────────────────
  const sectionScores = {};
  SECTIONS.forEach(id => {
    const sectionAttempts = attempts.filter(a => a.sectionId === id);
    if (sectionAttempts.length === 0) {
      sectionScores[id] = progress[id] ? 50 : 0;
    } else {
      const best = Math.max(...sectionAttempts.map(a => a.pct));
      sectionScores[id] = best;
    }
  });

  // ── Bot game stats ────────────────────────────
  const totalGames = botGames.length;
  const wins = botGames.filter(g => g.won).length;
  const winRate = totalGames > 0 ? Math.round((wins/totalGames)*100) : 0;
  const avgPot = totalGames > 0 ? Math.round(botGames.reduce((s,g)=>s+g.pot,0)/totalGames) : 0;

  const botWinRates = {};
  ['TAG','LAG','Fish','Nit'].forEach(type => {
    const games = botGames.filter(g => g.botTypes?.includes(type));
    const w = games.filter(g => g.won).length;
    botWinRates[type] = games.length > 0 ? Math.round((w/games.length)*100) : null;
  });

  // ── Quiz performance ──────────────────────────
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((s,a)=>s+a.pct,0)/totalAttempts) : 0;
  const sectionsCompleted = SECTIONS.filter(s => progress[s]).length;

  // ── Render ────────────────────────────────────
  el.innerHTML = `
    <div class="an-grid-4">
      <div class="an-stat"><div class="an-num">${sectionsCompleted}/8</div><div class="an-lbl">Sections done</div></div>
      <div class="an-stat"><div class="an-num">${avgScore}%</div><div class="an-lbl">Avg quiz score</div></div>
      <div class="an-stat"><div class="an-num">${winRate}%</div><div class="an-lbl">Bot win rate</div></div>
      <div class="an-stat"><div class="an-num">${credits.toLocaleString()}</div><div class="an-lbl">Credits</div></div>
    </div>

    <div class="an-row">
      <div class="an-card">
        <div class="an-card-title">Skill radar</div>
        <canvas id="radar-chart" width="280" height="280"></canvas>
      </div>
      <div class="an-card" style="flex:1">
        <div class="an-card-title">Quiz scores by section</div>
        <div class="an-bars">
          ${SECTIONS.map((id,i) => `
            <div class="an-bar-row">
              <div class="an-bar-label">${LABELS[i]}</div>
              <div class="an-bar-track">
                <div class="an-bar-fill ${sectionScores[id]>=70?'good':sectionScores[id]>=40?'mid':'low'}"
                  style="width:${sectionScores[id]}%"></div>
              </div>
              <div class="an-bar-pct">${sectionScores[id]}%</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="an-row">
      <div class="an-card" style="flex:1">
        <div class="an-card-title">Bot game performance</div>
        ${totalGames === 0
          ? '<div class="an-empty">No bot games played yet. Go to Play vs Bots to start!</div>'
          : `<div class="an-bot-grid">
              ${['TAG','LAG','Fish','Nit'].map(type => `
                <div class="an-bot-stat">
                  <div class="an-bot-emoji">${type==='TAG'?'🎯':type==='LAG'?'🔥':type==='Fish'?'🐟':'🪨'}</div>
                  <div class="an-bot-name">${type}</div>
                  <div class="an-bot-wr ${botWinRates[type]===null?'':'shown'}">${botWinRates[type]===null?'No data':botWinRates[type]+'% wins'}</div>
                </div>`).join('')}
            </div>
            <div style="margin-top:1rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;font-size:0.8rem;text-align:center">
              <div><div style="font-weight:600;color:var(--felt)">${totalGames}</div><div style="color:var(--text-muted)">Total hands</div></div>
              <div><div style="font-weight:600;color:#2a7a2a">${wins}</div><div style="color:var(--text-muted)">Wins</div></div>
              <div><div style="font-weight:600;color:var(--felt)">${avgPot}</div><div style="color:var(--text-muted)">Avg pot</div></div>
            </div>`}
      </div>
      <div class="an-card" style="flex:1">
        <div class="an-card-title">Credit history</div>
        <canvas id="credits-chart" width="280" height="160"></canvas>
        <div style="text-align:center;margin-top:0.5rem">
          <span style="font-family:var(--font-display);font-size:1.5rem;color:var(--felt);font-weight:700">${credits.toLocaleString()}</span>
          <span style="font-size:0.8rem;color:var(--text-muted);margin-left:0.4rem">current credits</span>
        </div>
      </div>
    </div>

    <div class="an-card">
      <div class="an-card-title">Learning timeline</div>
      ${attempts.length === 0
        ? '<div class="an-empty">Complete some quizzes to see your learning timeline.</div>'
        : `<div class="an-timeline">
            ${attempts.slice(-8).reverse().map(a => `
              <div class="an-tl-item">
                <div class="an-tl-dot ${a.pct>=70?'good':a.pct>=40?'mid':'low'}"></div>
                <div class="an-tl-body">
                  <div class="an-tl-title">${LABELS[SECTIONS.indexOf(a.sectionId)]||a.sectionId}</div>
                  <div class="an-tl-sub">${a.correct}/${a.total} correct · ${a.pct}%</div>
                </div>
                <div class="an-tl-time">${timeAgo(a.ts)}</div>
              </div>`).join('')}
          </div>`}
    </div>
  `;

  // Draw radar chart
  drawRadar(sectionScores, SECTIONS, LABELS);
  drawCreditsChart();
};

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff/60000);
  const h = Math.floor(m/60);
  const d = Math.floor(h/24);
  if (d>0) return d+'d ago';
  if (h>0) return h+'h ago';
  if (m>0) return m+'m ago';
  return 'just now';
}

function drawRadar(scores, sections, labels) {
  const canvas = document.getElementById('radar-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W=280, H=280, cx=140, cy=150, r=100;
  ctx.clearRect(0,0,W,H);
  const n = sections.length;
  const angles = sections.map((_,i) => (i/n)*Math.PI*2 - Math.PI/2);

  // Grid rings
  [25,50,75,100].forEach(pct => {
    ctx.beginPath();
    angles.forEach((a,i) => {
      const x = cx + (r*pct/100)*Math.cos(a);
      const y = cy + (r*pct/100)*Math.sin(a);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.strokeStyle='rgba(26,46,26,0.1)';
    ctx.lineWidth=1; ctx.stroke();
  });

  // Spokes
  angles.forEach(a => {
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(cx+r*Math.cos(a), cy+r*Math.sin(a));
    ctx.strokeStyle='rgba(26,46,26,0.1)';
    ctx.lineWidth=1; ctx.stroke();
  });

  // Data polygon
  ctx.beginPath();
  angles.forEach((a,i) => {
    const val = scores[sections[i]]||0;
    const x = cx + (r*val/100)*Math.cos(a);
    const y = cy + (r*val/100)*Math.sin(a);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.closePath();
  ctx.fillStyle='rgba(201,168,76,0.25)';
  ctx.strokeStyle='#c9a84c';
  ctx.lineWidth=2; ctx.fill(); ctx.stroke();

  // Dots
  angles.forEach((a,i) => {
    const val = scores[sections[i]]||0;
    const x = cx + (r*val/100)*Math.cos(a);
    const y = cy + (r*val/100)*Math.sin(a);
    ctx.beginPath();
    ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fillStyle='#c9a84c'; ctx.fill();
  });

  // Labels
  ctx.font='11px DM Sans,Arial,sans-serif';
  ctx.fillStyle='#6b6560';
  ctx.textBaseline='middle';
  angles.forEach((a,i) => {
    const x = cx + (r+18)*Math.cos(a);
    const y = cy + (r+18)*Math.sin(a);
    ctx.textAlign = x<cx-5?'right':x>cx+5?'left':'center';
    ctx.fillText(labels[i].split(' ')[0], x, y);
  });
}

function drawCreditsChart() {
  const canvas = document.getElementById('credits-chart');
  if (!canvas) return;
  const games = JSON.parse(localStorage.getItem('pokeriq_bot_games')||'[]');
  if (games.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.font='12px DM Sans,Arial,sans-serif';
    ctx.fillStyle='#9e9990';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('No games played yet', canvas.width/2, canvas.height/2);
    return;
  }
  // Build credit trajectory starting from 500
  let running = 500;
  const points = [500];
  games.slice(-20).forEach(g => {
    running += g.won ? g.pot : -Math.floor(g.pot/2);
    running = Math.max(0, running);
    points.push(running);
  });

  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const min=Math.min(...points)-50, max=Math.max(...points)+50;
  const toX = i => (i/(points.length-1))*(W-20)+10;
  const toY = v => H-10 - ((v-min)/(max-min))*(H-20);

  ctx.beginPath();
  points.forEach((v,i)=>i===0?ctx.moveTo(toX(i),toY(v)):ctx.lineTo(toX(i),toY(v)));
  ctx.strokeStyle='#c9a84c'; ctx.lineWidth=2; ctx.stroke();

  // Fill under line
  ctx.lineTo(toX(points.length-1),H); ctx.lineTo(toX(0),H); ctx.closePath();
  ctx.fillStyle='rgba(201,168,76,0.1)'; ctx.fill();

  // Dots
  points.forEach((v,i)=>{
    ctx.beginPath();
    ctx.arc(toX(i),toY(v),3,0,Math.PI*2);
    ctx.fillStyle='#c9a84c'; ctx.fill();
  });
}
