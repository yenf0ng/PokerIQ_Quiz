// ══════════════════════════════════════════════
//  PokerIQ — Firebase Auth + Firestore + Certificate
//  Replace YOUR_* values with your Firebase project config
// ══════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithPopup, signOut,
  GoogleAuthProvider, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── YOUR FIREBASE CONFIG ──────────────────────
// 1. Go to https://console.firebase.google.com
// 2. Create a project → Add web app → copy config here
const firebaseConfig = {
  apiKey:            "AIzaSyC1YLSEFCx-gQGHm1DakSvNkcfFb4rHbyM",
  authDomain:        "pokeriq-d89f9.firebaseapp.com",
  projectId:         "pokeriq-d89f9",
  storageBucket:     "pokeriq-d89f9.firebasestorage.app",
  messagingSenderId: "427514958357",
  appId:             "1:427514958357:web:52a15d2adb11204eaa741c",
  measurementId: "G-7DGJWRY73Z"
};
// ─────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const provider = new GoogleAuthProvider();

// ── Certificate branding ──────────────────────
// Change these to your preferred names
const CERT_ISSUER    = "PokerIQ Academy";   // shown as "issued by"
const CERT_COURSE    = "Texas Hold'em Mastery";
const CERT_SIGNATURE = "PokerIQ";           // signature line
// ─────────────────────────────────────────────

let currentUser = null;

// ── Auth state listener ────────────────────────
onAuthStateChanged(auth, async user => {
  currentUser = user;
  renderAuthBar(user);
  if (user) {
    await syncProgressFromFirestore(user.uid);
    prefillCertName(user.displayName);
  }
  checkCertEligibility();
});

// ── Render auth bar in topbar ─────────────────
function renderAuthBar(user) {
  const bar = document.getElementById('auth-bar');
  if (!bar) return;
  if (user) {
    bar.innerHTML = `
      <span class="sync-dot" id="sync-dot" title="Progress synced"></span>
      ${user.photoURL ? `<img class="user-avatar" src="${user.photoURL}" alt="${user.displayName}">` : ''}
      <span class="user-name">${user.displayName?.split(' ')[0] || 'Player'}</span>
      <button class="auth-btn" id="signout-btn">Sign out</button>
    `;
    document.getElementById('signout-btn')?.addEventListener('click', handleSignOut);
  } else {
    bar.innerHTML = `
      <button class="auth-btn signin" id="signin-btn">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="">
        Sign in with Google
      </button>
    `;
    document.getElementById('signin-btn')?.addEventListener('click', handleSignIn);
  }
}

// ── Sign in / out ─────────────────────────────
async function handleSignIn() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      console.error('Sign-in error:', e.message);
      alert('Sign-in failed. Check your Firebase config in auth.js.');
    }
  }
}
async function handleSignOut() {
  await signOut(auth);
  // Keep local progress, just clear sync state
  setSyncDot(false);
}

// ── Firestore: read progress ──────────────────
async function syncProgressFromFirestore(uid) {
  try {
    const ref  = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      // Merge cloud progress with local (cloud wins for completed sections)
      const local = getLocalProgress();
      const merged = { ...local, ...data.progress };
      saveLocalProgress(merged);
      updateProgressUI();
      setSyncDot(true);
    } else {
      // First time — upload local progress to cloud
      await pushProgressToFirestore(uid);
    }
  } catch (e) {
    console.warn('Firestore read failed (offline?):', e.message);
    setSyncDot(false);
  }
}

// ── Firestore: write progress ─────────────────
async function pushProgressToFirestore(uid) {
  try {
    const ref      = doc(db, 'users', uid);
    const progress = getLocalProgress();
    await setDoc(ref, {
      progress,
      displayName: currentUser?.displayName || '',
      email:       currentUser?.email || '',
      updatedAt:   serverTimestamp()
    }, { merge: true });
    setSyncDot(true);
  } catch (e) {
    console.warn('Firestore write failed:', e.message);
    setSyncDot(false);
  }
}

// ── Expose: called by main.js when section completed ─
window.onSectionMarkedComplete = async (sectionId) => {
  if (currentUser) {
    await pushProgressToFirestore(currentUser.uid);
  }
  checkCertEligibility();
};

// ── Sync dot indicator ────────────────────────
function setSyncDot(online) {
  const dot = document.getElementById('sync-dot');
  if (dot) dot.classList.toggle('offline', !online);
}

// ── Progress helpers (bridge to main.js) ──────
function getLocalProgress() {
  try { return JSON.parse(localStorage.getItem('pokeriq_progress') || '{}'); }
  catch(e) { return {}; }
}
function saveLocalProgress(p) {
  try { localStorage.setItem('pokeriq_progress', JSON.stringify(p)); }
  catch(e) {}
}

// ── Certificate eligibility ───────────────────
const ALL_SECTIONS = ['hand-rankings','playstyle','odds-calc','pot-odds','positions','bluffing','bankroll','glossary'];

function checkCertEligibility() {
  const p    = getLocalProgress();
  const done = ALL_SECTIONS.filter(s => p[s]).length;
  const pct  = Math.round((done / ALL_SECTIONS.length) * 100);
  const banner = document.getElementById('cert-banner');
  if (!banner) return;
  if (done === ALL_SECTIONS.length) {
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
    banner.querySelector('.cert-progress-note').textContent =
      `Complete all 8 sections to unlock your certificate. (${done}/8 done)`;
  }
  // Update dashboard
  renderDashboard(done, pct);
}

function renderDashboard(done, pct) {
  const dash = document.getElementById('progress-dashboard');
  if (!dash) return;
  if (currentUser) {
    dash.classList.add('show');
    dash.innerHTML = `
      <div class="dash-title">Your progress</div>
      <div class="dash-grid">
        <div class="dash-stat"><div class="dash-stat-num">${done}</div><div class="dash-stat-label">Sections done</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${8 - done}</div><div class="dash-stat-label">Remaining</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${pct}%</div><div class="dash-stat-label">Complete</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${done === 8 ? '🏆' : '🎯'}</div><div class="dash-stat-label">${done === 8 ? 'Certified!' : 'Keep going'}</div></div>
      </div>
    `;
  } else {
    dash.classList.remove('show');
  }
}

// ── Prefill cert name ─────────────────────────
function prefillCertName(displayName) {
  const input = document.getElementById('cert-name-input');
  if (input && displayName && !input.value) {
    input.value = displayName;
    drawCertificate(displayName);
  }
}

// ── Open / close certificate modal ───────────
window.openCertModal = function() {
  const modal = document.getElementById('cert-modal');
  if (modal) modal.classList.add('open');
  const name = document.getElementById('cert-name-input')?.value ||
               currentUser?.displayName || 'Your Name';
  drawCertificate(name);
};
window.closeCertModal = function() {
  document.getElementById('cert-modal')?.classList.remove('open');
};

// ── Certificate Canvas Drawing ────────────────
window.drawCertificate = function(recipientName) {
  const canvas = document.getElementById('cert-canvas');
  if (!canvas) return;
  const W = 900, H = 636;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Background ────────────────────────────
  ctx.fillStyle = '#fdfaf4';
  ctx.fillRect(0, 0, W, H);

  // ── Outer border ─────────────────────────
  ctx.strokeStyle = '#1a2e1a';
  ctx.lineWidth   = 12;
  roundRect(ctx, 12, 12, W - 24, H - 24, 18);
  ctx.stroke();

  // ── Inner border ─────────────────────────
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth   = 3;
  roundRect(ctx, 28, 28, W - 56, H - 56, 10);
  ctx.stroke();

  // ── Corner suit decorations ────────────────
  const suits = ['♠', '♥', '♦', '♣'];
  const corners = [[62, 62], [W - 62, 62], [62, H - 62], [W - 62, H - 62]];
  corners.forEach(([x, y], i) => {
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = (i === 1 || i === 3) ? '#c0392b' : '#1a2e1a';
    ctx.fillText(suits[i], x, y);
  });

  // ── Top suit row ──────────────────────────
  ctx.font = '18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const suitRow = ['♠', '♥', '♦', '♣', '♠', '♥', '♦', '♣', '♠'];
  suitRow.forEach((s, i) => {
    ctx.fillStyle = (s === '♥' || s === '♦') ? '#c0392b' : '#1a2e1a';
    ctx.globalAlpha = 0.25;
    ctx.fillText(s, 110 + i * 85, 54);
  });
  ctx.globalAlpha = 1;

  // ── Header: issuer name ───────────────────
  ctx.font = 'bold 13px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#c9a84c';
  ctx.letterSpacing = '0.12em';
  ctx.textAlign = 'center';
  ctx.fillText(CERT_ISSUER.toUpperCase(), W / 2, 90);

  // ── Decorative rule ───────────────────────
  drawRule(ctx, W / 2, 108, 260);

  // ── "Certificate of Completion" ───────────
  ctx.font = '15px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#6b6560';
  ctx.letterSpacing = '0.15em';
  ctx.fillText('CERTIFICATE OF COMPLETION', W / 2, 138);

  // ── Course name ───────────────────────────
  ctx.font = 'italic bold 22px Georgia, serif';
  ctx.fillStyle = '#1a2e1a';
  ctx.letterSpacing = '0';
  ctx.fillText(CERT_COURSE, W / 2, 172);

  // ── "This certifies that" ─────────────────
  ctx.font = '14px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#9e9990';
  ctx.fillText('This certifies that', W / 2, 218);

  // ── Recipient name ────────────────────────
  ctx.font = 'italic bold 48px Georgia, serif';
  ctx.fillStyle = '#1a2e1a';
  const name = recipientName || 'Your Name';
  ctx.fillText(name, W / 2, 290);

  // ── Name underline ────────────────────────
  const nameW = Math.min(ctx.measureText(name).width + 60, 500);
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nameW / 2, 308);
  ctx.lineTo(W / 2 + nameW / 2, 308);
  ctx.stroke();

  // ── "has successfully completed" ─────────
  ctx.font = '14px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#6b6560';
  ctx.fillText('has successfully completed all 8 modules of', W / 2, 338);

  // ── Big course title ──────────────────────
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillStyle = '#1a2e1a';
  ctx.fillText(CERT_COURSE, W / 2, 370);

  // ── Module list ───────────────────────────
  ctx.font = '11px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#9e9990';
  const modules = 'Hand Rankings · Playstyle Types · Odds Calculator · Pot Odds · Positional Play · Bluffing & Reads · Bankroll Management · Glossary';
  ctx.fillText(modules, W / 2, 396);

  // ── Divider ───────────────────────────────
  drawRule(ctx, W / 2, 418, 340);

  // ── Date ──────────────────────────────────
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.font = '12px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#6b6560';
  ctx.textAlign = 'left';
  ctx.fillText('Date of completion', 160, 448);
  ctx.font = 'bold 14px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#1a2e1a';
  ctx.fillText(today, 160, 468);

  // ── Signature line ────────────────────────
  ctx.textAlign = 'right';
  ctx.font = '12px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#6b6560';
  ctx.fillText('Issued by', W - 160, 448);
  ctx.font = 'italic bold 20px Georgia, serif';
  ctx.fillStyle = '#1a2e1a';
  ctx.fillText(CERT_SIGNATURE, W - 160, 472);
  ctx.strokeStyle = '#1a2e1a';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(W - 320, 480); ctx.lineTo(W - 100, 480);
  ctx.stroke();

  // ── Center seal ──────────────────────────
  drawSeal(ctx, W / 2, 463);

  // ── Bottom suit row ───────────────────────
  suitRow.forEach((s, i) => {
    ctx.textAlign = 'center';
    ctx.font = '18px Georgia, serif';
    ctx.fillStyle = (s === '♥' || s === '♦') ? '#c0392b' : '#1a2e1a';
    ctx.globalAlpha = 0.25;
    ctx.fillText(s, 110 + i * 85, H - 54);
  });
  ctx.globalAlpha = 1;

  // ── Footer ───────────────────────────────
  ctx.textAlign = 'center';
  ctx.font = '10px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#c9a84c';
  ctx.globalAlpha = 0.6;
  ctx.fillText(CERT_ISSUER + ' · pokeriq.github.io', W / 2, H - 44);
  ctx.globalAlpha = 1;
};

// ── Helper: rounded rect ──────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Helper: decorative rule ───────────────────
function drawRule(ctx, cx, y, halfW) {
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - halfW, y); ctx.lineTo(cx - 18, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 18, y); ctx.lineTo(cx + halfW, y); ctx.stroke();
  ctx.font = '12px Georgia, serif';
  ctx.fillStyle = '#c9a84c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♦', cx, y);
}

// ── Helper: center seal ───────────────────────
function drawSeal(ctx, cx, cy) {
  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.lineWidth = 0.75;
  ctx.stroke();
  // Fill
  ctx.fillStyle = 'rgba(201,168,76,0.07)';
  ctx.fill();
  // Big suit
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillStyle = '#1a2e1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♠', cx, cy);
  // Small text around
  ctx.font = '7px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = '#c9a84c';
  ctx.letterSpacing = '0.05em';
  ctx.fillText('CERTIFIED', cx, cy + 20);
}

// ── Download certificate ──────────────────────
window.downloadCertificate = function() {
  const canvas = document.getElementById('cert-canvas');
  if (!canvas) return;
  const name = document.getElementById('cert-name-input')?.value || 'PokerIQ_Certificate';
  const link  = document.createElement('a');
  link.download = name.replace(/\s+/g, '_') + '_PokerIQ_Certificate.png';
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
};

// ── Live preview on name input ────────────────
document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('cert-name-input');
  if (nameInput) {
    nameInput.addEventListener('input', () => drawCertificate(nameInput.value));
  }
  // Close modal on backdrop click
  document.getElementById('cert-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('cert-modal')) closeCertModal();
  });
});
