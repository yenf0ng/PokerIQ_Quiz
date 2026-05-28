// ══════════════════════════════════════════════
//  PokerIQ — Friend Groups + Session Tracker
// ══════════════════════════════════════════════

// ── Group state ────────────────────────────────
window.currentGroup = null;

// ── Generate invite code ───────────────────────
function genCode() {
  return Math.random().toString(36).substring(2,8).toUpperCase();
}

// ── Create group ───────────────────────────────
window.createGroup = async function() {
  if (!window._db || !window.currentUserId) {
    alert('Sign in first to create a group.');
    return;
  }
  const nameEl = document.getElementById('group-name-input');
  const name = nameEl?.value?.trim();
  if (!name) { alert('Enter a group name.'); return; }

  const btn = document.getElementById('create-group-btn');
  if (btn) { btn.textContent = 'Creating…'; btn.disabled = true; }

  try {
    const {doc, setDoc, serverTimestamp, collection} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const code = genCode();
    const groupRef = doc(collection(window._db, 'groups'));
    const groupId = groupRef.id;
    const displayName = localStorage.getItem('pokeriq_display_name') || window.currentUserName || 'Player';

    await setDoc(groupRef, {
      name,
      code,
      createdBy: window.currentUserId,
      members: { [window.currentUserId]: { displayName, joinedAt: Date.now() } },
      createdAt: serverTimestamp()
    });

    localStorage.setItem('pokeriq_group_id', groupId);
    localStorage.setItem('pokeriq_group_code', code);
    localStorage.setItem('pokeriq_group_name', name);

    if (btn) { btn.textContent = 'Create Group'; btn.disabled = false; }
    if (nameEl) nameEl.value = '';
    renderGroupPage();
    showToast('Group "'+name+'" created! Code: '+code);
  } catch(e) {
    console.warn('Create group:', e.message);
    if (btn) { btn.textContent = 'Create Group'; btn.disabled = false; }
    alert('Failed: '+e.message);
  }
};

// ── Join group ─────────────────────────────────
window.joinGroup = async function() {
  if (!window._db || !window.currentUserId) {
    alert('Sign in first to join a group.');
    return;
  }
  const codeEl = document.getElementById('join-code-input');
  const code = codeEl?.value?.trim().toUpperCase();
  if (!code || code.length !== 6) { alert('Enter a valid 6-character code.'); return; }

  const btn = document.getElementById('join-group-btn');
  if (btn) { btn.textContent = 'Joining…'; btn.disabled = true; }

  try {
    const {collection, getDocs, query, where, doc, updateDoc} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(collection(window._db,'groups'), where('code','==',code));
    const snap = await getDocs(q);

    if (snap.empty) {
      alert('Group not found. Check the code and try again.');
      if (btn) { btn.textContent = 'Join Group'; btn.disabled = false; }
      return;
    }

    const groupDoc = snap.docs[0];
    const groupId = groupDoc.id;
    const groupData = groupDoc.data();
    const displayName = localStorage.getItem('pokeriq_display_name') || window.currentUserName || 'Player';

    await updateDoc(doc(window._db,'groups',groupId), {
      [`members.${window.currentUserId}`]: { displayName, joinedAt: Date.now() }
    });

    localStorage.setItem('pokeriq_group_id', groupId);
    localStorage.setItem('pokeriq_group_code', code);
    localStorage.setItem('pokeriq_group_name', groupData.name);

    if (btn) { btn.textContent = 'Join Group'; btn.disabled = false; }
    if (codeEl) codeEl.value = '';
    renderGroupPage();
    showToast('Joined "'+groupData.name+'"!');
  } catch(e) {
    console.warn('Join group:', e.message);
    if (btn) { btn.textContent = 'Join Group'; btn.disabled = false; }
    alert('Failed: '+e.message);
  }
};

// ── Leave group ────────────────────────────────
window.leaveGroup = function() {
  if (!confirm('Leave this group?')) return;
  localStorage.removeItem('pokeriq_group_id');
  localStorage.removeItem('pokeriq_group_code');
  localStorage.removeItem('pokeriq_group_name');
  renderGroupPage();
};

// ── Log session ────────────────────────────────
window.logSession = async function() {
  if (!window._db || !window.currentUserId) {
    alert('Sign in to log sessions.');
    return;
  }
  const groupId = localStorage.getItem('pokeriq_group_id');
  if (!groupId) { alert('Join a group first.'); return; }

  const date    = document.getElementById('session-date')?.value;
  const location = document.getElementById('session-location')?.value?.trim() || 'Home game';
  const notes   = document.getElementById('session-notes')?.value?.trim() || '';

  // Collect player rows
  const rows = document.querySelectorAll('.player-session-row');
  const players = [];
  rows.forEach(row => {
    const name   = row.querySelector('.ps-name')?.value?.trim();
    const buyin  = parseFloat(row.querySelector('.ps-buyin')?.value)||0;
    const result = parseFloat(row.querySelector('.ps-result')?.value)||0;
    if (name) players.push({name, buyin, result, net: result-buyin});
  });

  if (players.length === 0) { alert('Add at least one player.'); return; }

  const btn = document.getElementById('log-session-btn');
  if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }

  try {
    const {collection, addDoc, serverTimestamp} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await addDoc(collection(window._db,'groups',groupId,'sessions'), {
      date: date || new Date().toISOString().split('T')[0],
      location, notes, players,
      loggedBy: window.currentUserId,
      loggedByName: localStorage.getItem('pokeriq_display_name') || window.currentUserName || 'Player',
      createdAt: serverTimestamp()
    });

    if (btn) { btn.textContent = 'Log Session'; btn.disabled = false; }
    document.getElementById('session-form')?.reset();
    resetPlayerRows();
    loadSessions();
    showToast('Session logged!');
  } catch(e) {
    console.warn('Log session:', e.message);
    if (btn) { btn.textContent = 'Log Session'; btn.disabled = false; }
    alert('Failed: '+e.message);
  }
};

// ── Player row management ──────────────────────
window.addPlayerRow = function() {
  const container = document.getElementById('player-rows');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'player-session-row';
  row.innerHTML = `
    <input class="ps-name" placeholder="Player name" style="flex:2">
    <input class="ps-buyin" type="number" placeholder="Buy-in" min="0" step="0.01" style="flex:1">
    <input class="ps-result" type="number" placeholder="Cash out" min="0" step="0.01" style="flex:1">
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:1.1rem;padding:0 0.25rem">×</button>
  `;
  container.appendChild(row);
};

function resetPlayerRows() {
  const container = document.getElementById('player-rows');
  if (!container) return;
  container.innerHTML = '';
  addPlayerRow(); addPlayerRow();
}

// ── Load sessions ──────────────────────────────
window.loadSessions = async function() {
  const groupId = localStorage.getItem('pokeriq_group_id');
  const el = document.getElementById('sessions-list');
  if (!el || !groupId || !window._db) return;
  el.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:1rem 0">Loading…</div>';

  try {
    const {collection, getDocs, query, orderBy, limit} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(collection(window._db,'groups',groupId,'sessions'), orderBy('createdAt','desc'), limit(20));
    const snap = await getDocs(q);

    if (snap.empty) { el.innerHTML = '<div class="an-empty">No sessions logged yet. Log your first game!</div>'; return; }

    el.innerHTML = snap.docs.map(d => {
      const s = d.data();
      const winner = s.players?.reduce((a,b) => a.net>b.net?a:b, s.players[0]);
      const totalPot = s.players?.reduce((sum,p)=>sum+p.buyin,0)||0;
      return `
        <div class="session-card">
          <div class="session-header">
            <div>
              <div class="session-title">${s.location||'Home game'}</div>
              <div class="session-date">${s.date||'—'} · ${s.players?.length||0} players · ${totalPot} total pot</div>
            </div>
            <div class="session-winner">🏆 ${winner?.name||'—'} +${winner?.net>=0?'+':''}${winner?.net||0}</div>
          </div>
          <div class="session-players">
            ${(s.players||[]).map(p=>`
              <div class="session-player ${p.net>=0?'pos':'neg'}">
                <span>${p.name}</span>
                <span>${p.net>=0?'+':''}${p.net}</span>
              </div>`).join('')}
          </div>
          ${s.notes?`<div class="session-notes">${s.notes}</div>`:''}
        </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<div style="color:var(--red);font-size:0.85rem">Error loading sessions: '+e.message+'</div>';
  }
};

// ── Load group leaderboard ─────────────────────
window.loadGroupLeaderboard = async function() {
  const groupId = localStorage.getItem('pokeriq_group_id');
  const el = document.getElementById('group-lb-body');
  if (!el || !groupId || !window._db) return;
  el.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Loading…</td></tr>';

  try {
    const {doc, getDoc, collection, getDocs} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const groupSnap = await getDoc(doc(window._db,'groups',groupId));
    if (!groupSnap.exists()) { el.innerHTML = '<tr><td colspan="5">Group not found</td></tr>'; return; }

    const members = groupSnap.data().members || {};
    const uids = Object.keys(members);

    // Get leaderboard scores for each member
    const scores = await Promise.all(uids.map(async uid => {
      try {
        const snap = await getDoc(doc(window._db,'leaderboard',uid));
        if (snap.exists()) return {uid, ...snap.data()};
        return {uid, displayName: members[uid].displayName, combinedScore:0, sectionsComplete:0, quizScore:0, credits:500};
      } catch(e) { return {uid, displayName: members[uid].displayName, combinedScore:0, sectionsComplete:0, quizScore:0, credits:500}; }
    }));

    scores.sort((a,b) => b.combinedScore - a.combinedScore);
    const FLAGS = window.COUNTRY_FLAGS || {};

    el.innerHTML = scores.map((s,i) => {
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1;
      const isMe = s.uid === window.currentUserId;
      const flag = FLAGS[s.country]||'';
      return `<tr class="${isMe?'current-user-row':''}">
        <td class="rank-cell">${medal}</td>
        <td class="name-cell">
          <div class="lb-avatar-init">${(s.displayName||'?')[0].toUpperCase()}</div>
          <span>${s.displayName||'Anonymous'}</span>
          ${isMe?'<span class="you-badge">You</span>':''}
        </td>
        <td class="center">${s.sectionsComplete||0}/8</td>
        <td class="credits-cell">💰 ${(s.credits||500).toLocaleString()}</td>
        <td class="score-cell">${(s.combinedScore||0).toLocaleString()}</td>
      </tr>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<tr><td colspan="5" style="color:var(--red)">Error: '+e.message+'</td></tr>';
  }
};

// ── Render group page ──────────────────────────
window.renderGroupPage = function() {
  const el = document.getElementById('group-content');
  if (!el) return;

  const groupId   = localStorage.getItem('pokeriq_group_id');
  const groupCode = localStorage.getItem('pokeriq_group_code');
  const groupName = localStorage.getItem('pokeriq_group_name');
  const signedIn  = !!window.currentUserId;

  if (!signedIn) {
    el.innerHTML = `<div class="an-empty" style="text-align:center;padding:3rem">
      <div style="font-size:2rem;margin-bottom:0.75rem">🔒</div>
      <div style="font-weight:600;color:var(--felt);margin-bottom:0.5rem">Sign in to use Groups</div>
      <div style="font-size:0.85rem;color:var(--text-muted)">Sign in with Google to create or join a friend group.</div>
    </div>`;
    return;
  }

  if (!groupId) {
    el.innerHTML = `
      <div class="an-row" style="gap:1.5rem;flex-wrap:wrap">
        <div class="an-card" style="flex:1;min-width:220px">
          <div class="an-card-title">Create a group</div>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem">Start a private group for your friends. Share the invite code with them.</p>
          <input id="group-name-input" placeholder="Group name e.g. Friday Night Poker" style="width:100%;padding:0.6rem;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font-body);font-size:0.875rem;background:var(--bg);color:var(--text);margin-bottom:0.75rem">
          <button class="btn btn-primary" id="create-group-btn" onclick="createGroup()">Create Group</button>
        </div>
        <div class="an-card" style="flex:1;min-width:220px">
          <div class="an-card-title">Join a group</div>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem">Got an invite code from a friend? Enter it below.</p>
          <input id="join-code-input" placeholder="6-character code e.g. AB1C2D" maxlength="6" style="width:100%;padding:0.6rem;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font-body);font-size:0.875rem;background:var(--bg);color:var(--text);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.15em">
          <button class="btn btn-primary" id="join-group-btn" onclick="joinGroup()">Join Group</button>
        </div>
      </div>`;
    return;
  }

  // In a group
  el.innerHTML = `
    <div class="an-card" style="margin-bottom:1.25rem">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
        <div>
          <div style="font-family:var(--font-display);font-size:1.2rem;color:var(--felt)">${groupName}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">
            Invite code: <strong style="font-family:var(--font-mono);color:var(--felt);letter-spacing:0.12em">${groupCode}</strong>
            <span style="color:var(--text-light)"> — share this with friends</span>
          </div>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-secondary" style="font-size:0.8rem;padding:0.4rem 0.75rem" onclick="navigator.clipboard.writeText('${groupCode}');showToast('Code copied!')">Copy code</button>
          <button class="btn btn-secondary" style="font-size:0.8rem;padding:0.4rem 0.75rem;color:var(--red)" onclick="leaveGroup()">Leave group</button>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem">

      <div class="an-card">
        <div class="an-card-title">Group leaderboard</div>
        <div class="lb-table-wrap">
          <table class="lb-table">
            <thead><tr><th>#</th><th>Player</th><th class="center">Sections</th><th>Credits</th><th>Score</th></tr></thead>
            <tbody id="group-lb-body"><tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--text-muted)">Loading…</td></tr></tbody>
          </table>
        </div>
        <button class="btn btn-secondary" style="margin-top:0.75rem;font-size:0.8rem;padding:0.4rem 0.75rem" onclick="loadGroupLeaderboard()">↺ Refresh</button>
      </div>

      <div class="an-card">
        <div class="an-card-title">Log a session</div>
        <form id="session-form" onsubmit="event.preventDefault();logSession()">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.75rem">
            <div>
              <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:3px">Date</label>
              <input type="date" id="session-date" style="width:100%;padding:0.5rem;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font-body);font-size:0.8rem;background:var(--bg);color:var(--text)" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div>
              <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:3px">Location</label>
              <input id="session-location" placeholder="Home game" style="width:100%;padding:0.5rem;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font-body);font-size:0.8rem;background:var(--bg);color:var(--text)">
            </div>
          </div>
          <div style="font-size:0.75rem;font-weight:500;color:var(--text-muted);margin-bottom:0.4rem">Players (name · buy-in · cash-out)</div>
          <div id="player-rows" style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.5rem"></div>
          <button type="button" class="btn btn-secondary" style="font-size:0.75rem;padding:0.35rem 0.75rem;margin-bottom:0.75rem" onclick="addPlayerRow()">+ Add player</button>
          <div>
            <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:3px">Notes (optional)</label>
            <input id="session-notes" placeholder="Bad beat story, memorable hands…" style="width:100%;padding:0.5rem;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font-body);font-size:0.8rem;background:var(--bg);color:var(--text);margin-bottom:0.75rem">
          </div>
          <button type="submit" class="btn btn-primary" id="log-session-btn" style="width:100%">Log Session</button>
        </form>
      </div>
    </div>

    <div class="an-card">
      <div class="an-card-title">Session history</div>
      <div id="sessions-list"><div class="an-empty">Loading sessions…</div></div>
    </div>
  `;

  // Init player rows
  resetPlayerRows();

  // Load data
  loadGroupLeaderboard();
  loadSessions();
};

// ── Show toast (fallback if profile.js not loaded)
function showToast(msg) {
  if (typeof window.showToast === 'function') { window.showToast(msg); return; }
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--felt);color:var(--accent);padding:0.5rem 1.25rem;border-radius:20px;font-size:0.85rem;font-weight:500;z-index:400;opacity:0;transition:opacity 0.2s'; document.body.appendChild(t); }
  t.textContent=msg; t.style.opacity='1';
  setTimeout(()=>t.style.opacity='0',2200);
}
