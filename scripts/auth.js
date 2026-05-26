// ══════════════════════════════════════════════
//  PokerIQ — Firebase Auth + Firestore + Certificate
//  Config is loaded from scripts/firebase-config.js
//  (that file is in .gitignore — never pushed to GitHub)
// ══════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithPopup, signOut,
  GoogleAuthProvider, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Read config from firebase-config.js ───────
// If config is missing, show a helpful warning
if (!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey.includes('PASTE_')) {
  console.warn(
    '%c PokerIQ: Firebase not configured ',
    'background:#c9a84c;color:#1a2e1a;font-weight:bold;padding:4px 8px;border-radius:4px',
    '\n\n1. Copy scripts/firebase-config.template.js → scripts/firebase-config.js' +
    '\n2. Fill in your Firebase project values' +
    '\n3. Refresh the page\n'
  );
}

const firebaseConfig = window.FIREBASE_CONFIG || {};
const CERT = window.CERT_CONFIG || {
  issuer:    'PokerIQ Academy',
  course:    "Texas Hold'em Mastery",
  signature: 'PokerIQ',
  website:   'pokeriq.github.io'
};

let app, auth, db, provider, currentUser = null;
let firebaseReady = false;

try {
  app      = initializeApp(firebaseConfig);
  auth     = getAuth(app);
  db       = getFirestore(app);
  provider = new GoogleAuthProvider();
  firebaseReady = true;
} catch(e) {
  console.warn('Firebase init failed — running in offline mode:', e.message);
  renderAuthBar(null);
}

// ── Auth state listener ────────────────────────
if (firebaseReady) {
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    renderAuthBar(user);
    if (user) {
      await syncProgressFromFirestore(user.uid);
      prefillCertName(user.displayName);
    }
    checkCertEligibility();
  });
}

// ── Render auth bar ────────────────────────────
function renderAuthBar(user) {
  const bar = document.getElementById('auth-bar');
  if (!bar) return;
  if (user) {
    bar.innerHTML = `
      <span class="sync-dot" id="sync-dot" title="Progress synced to cloud"></span>
      ${user.photoURL
        ? `<img class="user-avatar" src="${user.photoURL}" alt="${user.displayName}">`
        : `<div class="user-avatar-initial">${(user.displayName||'P')[0]}</div>`}
      <span class="user-name">${user.displayName?.split(' ')[0] || 'Player'}</span>
      <button class="auth-btn" id="signout-btn">Sign out</button>
    `;
    document.getElementById('signout-btn')?.addEventListener('click', handleSignOut);
  } else {
    bar.innerHTML = firebaseReady ? `
      <button class="auth-btn signin" id="signin-btn">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style="width:16px;height:16px">
        Sign in with Google
      </button>
    ` : `<span style="font-size:0.75rem;color:rgba(255,255,255,0.4)">Firebase not configured</span>`;
    document.getElementById('signin-btn')?.addEventListener('click', handleSignIn);
  }
}

// ── Sign in ────────────────────────────────────
async function handleSignIn() {
  const btn = document.getElementById('signin-btn');
  if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }
  try {
    await signInWithPopup(auth, provider);
  } catch(e) {
    if (btn) { btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style="width:16px;height:16px"> Sign in with Google'; btn.disabled = false; }
    if (e.code === 'auth/unauthorized-domain') {
      alert('Domain not authorised.\n\nFix: Firebase Console → Authentication → Settings → Authorised domains → Add your GitHub Pages domain.');
    } else if (e.code !== 'auth/popup-closed-by-user') {
      alert('Sign-in failed: ' + e.message);
    }
  }
}

// ── Sign out ───────────────────────────────────
async function handleSignOut() {
  await signOut(auth);
  setSyncDot(false);
  checkCertEligibility();
}

// ── Firestore: pull progress from cloud ────────
async function syncProgressFromFirestore(uid) {
  try {
    const ref  = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data   = snap.data();
      const local  = getLocalProgress();
      const merged = { ...local, ...(data.progress || {}) };
      saveLocalProgress(merged);
      if (typeof updateProgressUI === 'function') updateProgressUI();
    } else {
      await pushProgressToFirestore(uid);
    }
    setSyncDot(true);
  } catch(e) {
    console.warn('Firestore read failed:', e.message);
    setSyncDot(false);
  }
}

// ── Firestore: push progress to cloud ──────────
async function pushProgressToFirestore(uid) {
  try {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, {
      progress:    getLocalProgress(),
      displayName: currentUser?.displayName || '',
      email:       currentUser?.email || '',
      updatedAt:   serverTimestamp()
    }, { merge: true });
    setSyncDot(true);
  } catch(e) {
    console.warn('Firestore write failed:', e.message);
    setSyncDot(false);
  }
}

// ── Called by main.js after each section done ──
window.onSectionMarkedComplete = async (sectionId) => {
  if (currentUser && firebaseReady) {
    await pushProgressToFirestore(currentUser.uid);
  }
  checkCertEligibility();
};

// ── Sync dot ───────────────────────────────────
function setSyncDot(online) {
  const dot = document.getElementById('sync-dot');
  if (dot) {
    dot.classList.toggle('offline', !online);
    dot.title = online ? 'Progress synced to cloud ✓' : 'Offline — progress saved locally';
  }
}

// ── Local storage helpers ──────────────────────
function getLocalProgress() {
  try { return JSON.parse(localStorage.getItem('pokeriq_progress') || '{}'); }
  catch(e) { return {}; }
}
function saveLocalProgress(p) {
  try { localStorage.setItem('pokeriq_progress', JSON.stringify(p)); }
  catch(e) {}
}

// ── Certificate eligibility check ─────────────
const ALL_SECTIONS = [
  'hand-rankings','playstyle','odds-calc','pot-odds',
  'positions','bluffing','bankroll','glossary'
];

function checkCertEligibility() {
  const p    = getLocalProgress();
  const done = ALL_SECTIONS.filter(s => p[s]).length;
  const pct  = Math.round((done / ALL_SECTIONS.length) * 100);
  const banner = document.getElementById('cert-banner');
  if (banner) {
    if (done === ALL_SECTIONS.length) {
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
      const note = banner.querySelector('.cert-progress-note');
      if (note) note.textContent = `Complete all 8 sections to unlock. (${done}/8 done)`;
    }
  }
  renderDashboard(done, pct);
}

// ── Progress dashboard (shows when signed in) ──
function renderDashboard(done, pct) {
  const dash = document.getElementById('progress-dashboard');
  if (!dash) return;
  if (currentUser) {
    dash.classList.add('show');
    dash.innerHTML = `
      <div class="dash-title">
        <span class="sync-dot" style="display:inline-block;margin-right:6px" id="sync-dot-dash"></span>
        ${currentUser.displayName || 'Your'} progress — synced to cloud
      </div>
      <div class="dash-grid">
        <div class="dash-stat">
          <div class="dash-stat-num">${done}</div>
          <div class="dash-stat-label">Sections done</div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-num">${8 - done}</div>
          <div class="dash-stat-label">Remaining</div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-num">${pct}%</div>
          <div class="dash-stat-label">Complete</div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-num">${done === 8 ? '🏆' : '🎯'}</div>
          <div class="dash-stat-label">${done === 8 ? 'Certified!' : 'Keep going'}</div>
        </div>
      </div>
    `;
  } else {
    dash.classList.remove('show');
  }
}

// ── Prefill certificate name from Google account
function prefillCertName(displayName) {
  const input = document.getElementById('cert-name-input');
  if (input && displayName && !input.value) {
    input.value = displayName;
    drawCertificate(displayName);
  }
}

// ── Open / close modal ─────────────────────────
window.openCertModal = function() {
  const modal = document.getElementById('cert-modal');
  if (modal) modal.classList.add('open');
  const name = document.getElementById('cert-name-input')?.value
    || currentUser?.displayName || 'Your Name';
  drawCertificate(name);
};
window.closeCertModal = function() {
  document.getElementById('cert-modal')?.classList.remove('open');
};

// ══════════════════════════════════════════════
//  CERTIFICATE CANVAS
// ══════════════════════════════════════════════
window.drawCertificate = function(recipientName) {
  const canvas = document.getElementById('cert-canvas');
  if (!canvas) return;
  const W = 900, H = 636;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#fdfaf4';
  ctx.fillRect(0, 0, W, H);

  // Outer border (dark green)
  ctx.strokeStyle = '#1a2e1a';
  ctx.lineWidth   = 12;
  roundRect(ctx, 12, 12, W - 24, H - 24, 18);
  ctx.stroke();

  // Inner border (gold)
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 3;
  roundRect(ctx, 28, 28, W - 56, H - 56, 10);
  ctx.stroke();

  // Second inner border (thin gold)
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 0.75;
  roundRect(ctx, 36, 36, W - 72, H - 72, 6);
  ctx.stroke();

  // Corner suit decorations
  const suits   = ['♠','♥','♦','♣'];
  const corners = [[62,62],[W-62,62],[62,H-62],[W-62,H-62]];
  corners.forEach(([x,y], i) => {
    ctx.font         = 'bold 28px Georgia, serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = (i===1||i===3) ? '#c0392b' : '#1a2e1a';
    ctx.fillText(suits[i], x, y);
  });

  // Faint suit pattern rows
  const suitRow = ['♠','♥','♦','♣','♠','♥','♦','♣','♠'];
  [54, H-54].forEach(rowY => {
    suitRow.forEach((s, i) => {
      ctx.font         = '18px Georgia, serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = (s==='♥'||s==='♦') ? '#c0392b' : '#1a2e1a';
      ctx.globalAlpha  = 0.2;
      ctx.fillText(s, 110 + i * 85, rowY);
    });
  });
  ctx.globalAlpha = 1;

  // Issuer name (gold, spaced caps)
  ctx.font      = 'bold 12px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#c9a84c';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '0.18em';
  ctx.fillText(CERT.issuer.toUpperCase(), W/2, 88);

  // Decorative rules
  drawRule(ctx, W/2, 106, 240);

  // "Certificate of Completion"
  ctx.font         = '13px "DM Sans", Arial, sans-serif';
  ctx.fillStyle    = '#9e9990';
  ctx.letterSpacing = '0.14em';
  ctx.fillText('CERTIFICATE OF COMPLETION', W/2, 132);

  // Course name (italic)
  ctx.font         = 'italic bold 21px Georgia, serif';
  ctx.fillStyle    = '#2a4a2a';
  ctx.letterSpacing = '0';
  ctx.fillText(CERT.course, W/2, 165);

  // "This certifies that"
  ctx.font      = '13px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#b0a898';
  ctx.fillText('This certifies that', W/2, 210);

  // Recipient name — large italic serif
  const name = (recipientName || 'Your Name').trim();
  ctx.font      = 'italic bold 52px Georgia, serif';
  ctx.fillStyle = '#1a2e1a';
  // Scale down if name is very long
  const nameMetrics = ctx.measureText(name);
  if (nameMetrics.width > 700) {
    const scale = 700 / nameMetrics.width;
    ctx.font = `italic bold ${Math.floor(52 * scale)}px Georgia, serif`;
  }
  ctx.fillText(name, W/2, 288);

  // Gold underline beneath name
  const nw = Math.min(ctx.measureText(name).width + 80, 520);
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(W/2 - nw/2, 306);
  ctx.lineTo(W/2 + nw/2, 306);
  ctx.stroke();

  // "has successfully completed all 8 modules of"
  ctx.font      = '13px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#6b6560';
  ctx.fillText('has successfully completed all 8 modules of', W/2, 334);

  // Course title (bold)
  ctx.font      = 'bold 19px Georgia, serif';
  ctx.fillStyle = '#1a2e1a';
  ctx.fillText(CERT.course, W/2, 363);

  // Module list
  ctx.font      = '10.5px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#b0a898';
  ctx.fillText(
    'Hand Rankings · Playstyle Types · Odds Calculator · Pot Odds & Equity · ' +
    'Positional Play · Bluffing & Reads · Bankroll Management · Glossary',
    W/2, 386
  );

  // Divider rule
  drawRule(ctx, W/2, 408, 320);

  // Date (left side)
  const today = new Date().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});
  ctx.textAlign = 'left';
  ctx.font      = '11px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#b0a898';
  ctx.fillText('Date of completion', 155, 438);
  ctx.font      = 'bold 14px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#1a2e1a';
  ctx.fillText(today, 155, 458);
  // Date underline
  ctx.strokeStyle = '#e0d8c8';
  ctx.lineWidth   = 0.75;
  ctx.beginPath(); ctx.moveTo(155, 466); ctx.lineTo(370, 466); ctx.stroke();

  // Signature (right side)
  ctx.textAlign = 'right';
  ctx.font      = '11px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#b0a898';
  ctx.fillText('Issued by', W-155, 438);
  ctx.font      = 'italic bold 22px Georgia, serif';
  ctx.fillStyle = '#1a2e1a';
  ctx.fillText(CERT.signature, W-155, 462);
  ctx.strokeStyle = '#e0d8c8';
  ctx.lineWidth   = 0.75;
  ctx.beginPath(); ctx.moveTo(W-370, 470); ctx.lineTo(W-115, 470); ctx.stroke();

  // Centre seal
  drawSeal(ctx, W/2, 452);

  // Footer
  ctx.textAlign    = 'center';
  ctx.font         = '9.5px "DM Sans", Arial, sans-serif';
  ctx.fillStyle    = '#c9a84c';
  ctx.globalAlpha  = 0.55;
  ctx.fillText(CERT.website, W/2, H-42);
  ctx.globalAlpha  = 1;
};

// ── Helper: rounded rect path ──────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y,   x+w, y+r,   r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x,   y+h, x,   y+h-r, r);
  ctx.lineTo(x, y+r);   ctx.arcTo(x,   y,   x+r, y,     r);
  ctx.closePath();
}

// ── Helper: gold rule with centre diamond ──────
function drawRule(ctx, cx, y, halfW) {
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 0.75;
  ctx.beginPath(); ctx.moveTo(cx - halfW, y); ctx.lineTo(cx - 16, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 16, y);  ctx.lineTo(cx + halfW, y); ctx.stroke();
  ctx.font         = '11px Georgia, serif';
  ctx.fillStyle    = '#c9a84c';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♦', cx, y);
}

// ── Helper: wax seal ──────────────────────────
function drawSeal(ctx, cx, cy) {
  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 2;
  ctx.stroke();
  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, 31, 0, Math.PI * 2);
  ctx.lineWidth = 0.75;
  ctx.stroke();
  // Fill
  ctx.fillStyle = 'rgba(201,168,76,0.06)';
  ctx.fill();
  // Spade
  ctx.font         = 'bold 30px Georgia, serif';
  ctx.fillStyle    = '#1a2e1a';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♠', cx, cy - 3);
  // "CERTIFIED" text
  ctx.font      = '7px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#c9a84c';
  ctx.fillText('CERTIFIED', cx, cy + 22);
}

// ── Download PNG ───────────────────────────────
window.downloadCertificate = function() {
  const canvas = document.getElementById('cert-canvas');
  if (!canvas) return;
  const name = (document.getElementById('cert-name-input')?.value || 'PokerIQ_Certificate')
    .trim().replace(/\s+/g, '_');
  const link  = document.createElement('a');
  link.download = `${name}_PokerIQ_Certificate.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
};

// ── Init on DOM ready ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Live certificate preview
  const nameInput = document.getElementById('cert-name-input');
  if (nameInput) {
    nameInput.addEventListener('input', () => drawCertificate(nameInput.value));
  }
  // Close modal on backdrop click
  const modal = document.getElementById('cert-modal');
  modal?.addEventListener('click', e => {
    if (e.target === modal) closeCertModal();
  });
  // Keyboard close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCertModal();
  });
  // Run eligibility check for non-logged-in users too
  checkCertEligibility();
});
