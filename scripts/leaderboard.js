// ══════════════════════════════════════════════
//  PokerIQ — Leaderboard (leaderboard.js)
//  Reads/writes public scores from Firestore
// ══════════════════════════════════════════════

const COUNTRY_FLAGS = {
  'Malaysia':'🇲🇾','Singapore':'🇸🇬','Indonesia':'🇮🇩','Thailand':'🇹🇭',
  'Philippines':'🇵🇭','Vietnam':'🇻🇳','Myanmar':'🇲🇲','Cambodia':'🇰🇭',
  'United States':'🇺🇸','United Kingdom':'🇬🇧','Canada':'🇨🇦','Australia':'🇦🇺',
  'Germany':'🇩🇪','France':'🇫🇷','Japan':'🇯🇵','South Korea':'🇰🇷',
  'China':'🇨🇳','India':'🇮🇳','Brazil':'🇧🇷','Mexico':'🇲🇽',
  'Netherlands':'🇳🇱','Sweden':'🇸🇪','Norway':'🇳🇴','Denmark':'🇩🇰',
  'Spain':'🇪🇸','Italy':'🇮🇹','Portugal':'🇵🇹','Poland':'🇵🇱',
  'Turkey':'🇹🇷','Saudi Arabia':'🇸🇦','UAE':'🇦🇪','South Africa':'🇿🇦',
  'Nigeria':'🇳🇬','Egypt':'🇪🇬','Pakistan':'🇵🇰','Bangladesh':'🇧🇩',
  'Other':'🌍'
};

// Combined score formula
function calcScore(data) {
  const sections = (data.sectionsComplete || 0) * 100;
  const quiz     = (data.quizScore || 0) * 10;
  const credits  = Math.floor((data.credits || 500) / 10);
  return sections + quiz + credits;
}

// ── Push score to Firestore ────────────────────
window.pushLeaderboardScore = async function(db, uid, userData) {
  if (!db || !uid) return;
  try {
    const { doc, setDoc, serverTimestamp } = await import(
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
    );
    const progress  = JSON.parse(localStorage.getItem('pokeriq_progress')||'{}');
    const sections  = ['hand-rankings','playstyle','odds-calc','pot-odds','positions','bluffing','bankroll','glossary'];
    const done      = sections.filter(s=>progress[s]).length;
    const quizScore = parseInt(localStorage.getItem('pokeriq_quiz_score')||'0');
    const credits   = parseInt(localStorage.getItem('pokeriq_credits')||'500');
    const country   = localStorage.getItem('pokeriq_country')||'Other';

    const payload = {
      displayName:      userData.displayName || 'Anonymous',
      photoURL:         userData.photoURL || '',
      country,
      sectionsComplete: done,
      quizScore,
      credits,
      combinedScore:    calcScore({ sectionsComplete:done, quizScore, credits }),
      completedAt:      done===8 ? (localStorage.getItem('pokeriq_completed_at')||null) : null,
      updatedAt:        serverTimestamp()
    };

    await setDoc(doc(db,'leaderboard',uid), payload, { merge:true });
  } catch(e) {
    console.warn('Leaderboard push failed:', e.message);
  }
};

// ── Load leaderboard ───────────────────────────
window.loadLeaderboard = async function(db) {
  const el = document.getElementById('leaderboard-body');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">Loading...</td></tr>';

  try {
    const { collection, getDocs, query, orderBy, limit } = await import(
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
    );
    const q    = query(collection(db,'leaderboard'), orderBy('combinedScore','desc'), limit(50));
    const snap = await getDocs(q);

    if (snap.empty) {
      el.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No players yet — be the first!</td></tr>';
      return;
    }

    let html = '';
    let rank = 1;
    snap.forEach(doc => {
      const d = doc.data();
      const flag = COUNTRY_FLAGS[d.country] || '🌍';
      const medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'';
      const date = d.completedAt ? new Date(d.completedAt.seconds*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}) : '—';
      const isCurrentUser = doc.id === window.currentUserId;
      html += `
        <tr class="${isCurrentUser?'current-user-row':''}">
          <td class="rank-cell">${medal||rank}</td>
          <td class="name-cell">
            ${d.photoURL?`<img src="${d.photoURL}" class="lb-avatar" alt="">`:
              `<div class="lb-avatar-init">${(d.displayName||'?')[0]}</div>`}
            <span>${d.displayName||'Anonymous'}</span>
            ${isCurrentUser?'<span class="you-badge">You</span>':''}
          </td>
          <td class="flag-cell">${flag} <span class="country-name">${d.country||'—'}</span></td>
          <td class="center">${d.sectionsComplete||0}/8</td>
          <td class="center">${d.quizScore||0}/32</td>
          <td class="credits-cell">💰 ${(d.credits||500).toLocaleString()}</td>
          <td class="score-cell">${(d.combinedScore||0).toLocaleString()}</td>
        </tr>
      `;
      rank++;
    });
    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--red)">Failed to load — ${e.message}</td></tr>`;
  }
};

// ── Country picker modal ───────────────────────
window.openCountryPicker = function() {
  document.getElementById('country-modal').classList.add('open');
};
window.closeCountryPicker = function() {
  document.getElementById('country-modal').classList.remove('open');
};
window.saveCountry = function() {
  const sel = document.getElementById('country-select');
  if (!sel) return;
  const country = sel.value;
  localStorage.setItem('pokeriq_country', country);
  closeCountryPicker();
  if (typeof window.pushLeaderboardScore==='function' && window._db && window.currentUserId) {
    window.pushLeaderboardScore(window._db, window.currentUserId, {
      displayName: window.currentUserName,
      photoURL: window.currentUserPhoto
    });
  }
  // Refresh leaderboard
  if (window._db) window.loadLeaderboard(window._db);
};

// ── Quiz score tracker (accumulate across quizzes)
window.addQuizScore = function(correct) {
  const current = parseInt(localStorage.getItem('pokeriq_quiz_score')||'0');
  localStorage.setItem('pokeriq_quiz_score', current + correct);
};

// ── Credits helpers ────────────────────────────
window.playerCredits = parseInt(localStorage.getItem('pokeriq_credits')||'500');

window.saveCredits = function(amount) {
  window.playerCredits = amount;
  localStorage.setItem('pokeriq_credits', amount);
  // Update credits display
  const el = document.getElementById('credits-display');
  if (el) el.textContent = amount.toLocaleString() + ' cr';
  // Push to leaderboard
  if (window._db && window.currentUserId) {
    window.pushLeaderboardScore(window._db, window.currentUserId, {
      displayName: window.currentUserName,
      photoURL: window.currentUserPhoto
    });
  }
};

// Build country select options
window.buildCountrySelect = function() {
  const sel = document.getElementById('country-select');
  if (!sel) return;
  const saved = localStorage.getItem('pokeriq_country')||'';
  sel.innerHTML = Object.keys(COUNTRY_FLAGS).map(c =>
    `<option value="${c}" ${c===saved?'selected':''}>${COUNTRY_FLAGS[c]} ${c}</option>`
  ).join('');
};
