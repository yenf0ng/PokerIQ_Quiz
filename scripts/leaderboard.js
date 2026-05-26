// ══════════════════════════════════════════════
//  PokerIQ — Leaderboard
// ══════════════════════════════════════════════

function calcScore(d) {
  return (d.sectionsComplete||0)*100 + (d.quizScore||0)*10 + Math.floor((d.credits||500)/10);
}

window.pushLeaderboardScore = async function(db, uid, userData) {
  if (!db||!uid) return;
  try {
    const {doc,setDoc,serverTimestamp} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const ALL = ['hand-rankings','playstyle','odds-calc','pot-odds','positions','bluffing','bankroll','glossary'];
    const prog = JSON.parse(localStorage.getItem('pokeriq_progress')||'{}');
    const done = ALL.filter(s=>prog[s]).length;
    const quiz = parseInt(localStorage.getItem('pokeriq_quiz_score')||'0');
    const credits = parseInt(localStorage.getItem('pokeriq_credits')||'500');
    const country = localStorage.getItem('pokeriq_country')||'Other';
    const displayName = localStorage.getItem('pokeriq_display_name') || userData.displayName || 'Player';
    const photoURL = localStorage.getItem('pokeriq_custom_photo') || userData.photoURL || '';

    await setDoc(doc(db,'leaderboard',uid),{
      displayName, photoURL, country,
      sectionsComplete: done,
      quizScore: quiz,
      credits,
      combinedScore: calcScore({sectionsComplete:done,quizScore:quiz,credits}),
      completedAt: done===8 ? (localStorage.getItem('pokeriq_completed_at')||null) : null,
      updatedAt: serverTimestamp()
    },{merge:true});
  } catch(e) { console.warn('Leaderboard push:', e.message); }
};

window.loadLeaderboard = async function(db) {
  const el = document.getElementById('leaderboard-body');
  if (!el) return;
  if (!db) {
    el.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">Sign in to view leaderboard</td></tr>';
    return;
  }
  el.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">Loading…</td></tr>';
  try {
    const {collection,getDocs,query,orderBy,limit} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(collection(db,'leaderboard'),orderBy('combinedScore','desc'),limit(50));
    const snap = await getDocs(q);
    if (snap.empty){el.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No players yet — be the first!</td></tr>';return;}
    const FLAGS = window.COUNTRY_FLAGS||{};
    let html='', rank=1;
    snap.forEach(d=>{
      const v=d.data();
      const flag=FLAGS[v.country]||'🌍';
      const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
      const isMe=d.id===window.currentUserId;
      const date=v.completedAt?new Date(v.completedAt.seconds*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—';
      html+=`<tr class="${isMe?'current-user-row':''}">
        <td class="rank-cell">${medal}</td>
        <td class="name-cell">
          ${v.photoURL?`<img src="${v.photoURL}" class="lb-avatar" alt="">`:
            `<div class="lb-avatar-init">${(v.displayName||'?')[0].toUpperCase()}</div>`}
          <span>${v.displayName||'Anonymous'}</span>
          ${isMe?'<span class="you-badge">You</span>':''}
        </td>
        <td class="flag-cell">${flag} <span class="country-name">${v.country||'—'}</span></td>
        <td class="center">${v.sectionsComplete||0}/8</td>
        <td class="center">${v.quizScore||0}/32</td>
        <td class="credits-cell">💰 ${(v.credits||500).toLocaleString()}</td>
        <td class="score-cell">${(v.combinedScore||0).toLocaleString()}</td>
      </tr>`;
      rank++;
    });
    el.innerHTML=html;
  } catch(e) {
    el.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--red)">Error: ${e.message}</td></tr>`;
  }
};

window.addQuizScore = function(correct) {
  const cur = parseInt(localStorage.getItem('pokeriq_quiz_score')||'0');
  localStorage.setItem('pokeriq_quiz_score', cur+correct);
};

window.playerCredits = parseInt(localStorage.getItem('pokeriq_credits')||'500');

window.saveCredits = function(amount) {
  window.playerCredits = amount;
  localStorage.setItem('pokeriq_credits', amount);
  ['credits-display','credits-display-modal'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.textContent=amount.toLocaleString()+' cr';
  });
  if (window._db&&window.currentUserId) {
    window.pushLeaderboardScore(window._db,window.currentUserId,{
      displayName:window.currentUserName,photoURL:window.currentUserPhoto
    });
  }
};
