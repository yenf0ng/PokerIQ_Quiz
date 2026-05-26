// ══════════════════════════════════════════════
//  PokerIQ — auth.js (clean final)
// ══════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithPopup, signOut,
  GoogleAuthProvider, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = window.FIREBASE_CONFIG || {};
const CERT = window.CERT_CONFIG || {
  issuer: 'PokerIQ Academy', course: "Texas Hold'em Mastery",
  signature: 'PokerIQ', website: 'pokeriqs.netlify.app'
};

const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey.length > 10;
let app, auth, db, provider, currentUser = null, firebaseReady = false;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app); db = getFirestore(app);
    provider = new GoogleAuthProvider(); firebaseReady = true;
  } catch(e) { console.warn('Firebase init failed:', e.message); }
}

const ALL_SECTIONS = ['hand-rankings','playstyle','odds-calc','pot-odds','positions','bluffing','bankroll','glossary'];

// ── Helpers ─────────────────────────────────────
function getLocalProgress() {
  try { return JSON.parse(localStorage.getItem('pokeriq_progress')||'{}'); } catch(e) { return {}; }
}
function saveLocalProgress(p) {
  try { localStorage.setItem('pokeriq_progress', JSON.stringify(p)); } catch(e) {}
}
function setSyncDot(online) {
  document.querySelectorAll('.sync-dot').forEach(d => {
    d.classList.toggle('offline', !online);
    d.title = online ? 'Progress synced ✓' : 'Offline — saved locally';
  });
}

// ── Auth state ──────────────────────────────────
if (firebaseReady) {
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    window._auth = auth; window._currentUser = user; window._db = db;
    window.currentUserId    = user?.uid || null;
    window.currentUserName  = localStorage.getItem('pokeriq_display_name') || user?.displayName || null;
    window.currentUserPhoto = user?.photoURL || null;
    renderAuthBar(user);
    if (user) {
      await syncFromFirestore(user.uid);
      if (typeof window.pushLeaderboardScore === 'function')
        window.pushLeaderboardScore(db, user.uid, user);
    }
    checkCertEligibility();
    if (typeof window.updateProgressUI === 'function') window.updateProgressUI();
  });
} else {
  renderAuthBar(null);
  checkCertEligibility();
}

// ── Render auth bar ─────────────────────────────
function renderAuthBar(user) {
  const bar = document.getElementById('auth-bar');
  if (!bar) return;
  if (user) {
    const displayName = localStorage.getItem('pokeriq_display_name') || user.displayName || 'Player';
    const photo = user.photoURL || '';
    bar.innerHTML = `
      <span class="sync-dot" title="Synced"></span>
      ${photo ? `<img class="user-avatar" src="${photo}" alt="">` : `<div class="user-avatar-initial">${displayName[0].toUpperCase()}</div>`}
      <span class="user-name">${displayName.split(' ')[0]}</span>
      <button class="auth-btn" id="signout-btn">Sign out</button>`;
    document.getElementById('signout-btn')?.addEventListener('click', handleSignOut);
  } else if (firebaseReady) {
    bar.innerHTML = `
      <button class="auth-btn signin" id="signin-btn">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:16px;height:16px" alt="">
        Sign in with Google
      </button>`;
    document.getElementById('signin-btn')?.addEventListener('click', handleSignIn);
  } else {
    bar.innerHTML = `<span style="font-size:0.75rem;color:rgba(255,255,255,0.35)">Firebase not configured</span>`;
  }
}

// ── Sign in/out ─────────────────────────────────
async function handleSignIn() {
  const btn = document.getElementById('signin-btn');
  if (btn) { btn.textContent = 'Signing in…'; btn.disabled = true; }
  try {
    await signInWithPopup(auth, provider);
  } catch(e) {
    if (btn) { btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:16px;height:16px" alt=""> Sign in with Google'; btn.disabled = false; }
    if (e.code === 'auth/unauthorized-domain') alert('Add pokeriqs.netlify.app to Firebase → Auth → Authorised domains.');
    else if (e.code !== 'auth/popup-closed-by-user') alert('Sign-in error: ' + e.message);
  }
}
async function handleSignOut() {
  await signOut(auth);
  setSyncDot(false);
  checkCertEligibility();
}

// ── Firestore sync ──────────────────────────────
async function syncFromFirestore(uid) {
  try {
    const snap = await getDoc(doc(db,'users',uid));
    if (snap.exists()) {
      saveLocalProgress({...getLocalProgress(), ...(snap.data().progress||{})});
    } else {
      await pushToFirestore(uid);
    }
    setSyncDot(true);
  } catch(e) { console.warn('Firestore sync:', e.message); setSyncDot(false); }
}
async function pushToFirestore(uid) {
  try {
    const displayName = localStorage.getItem('pokeriq_display_name') || currentUser?.displayName || '';
    await setDoc(doc(db,'users',uid), {
      progress: getLocalProgress(), displayName,
      email: currentUser?.email || '', updatedAt: serverTimestamp()
    }, {merge:true});
    setSyncDot(true);
  } catch(e) { console.warn('Firestore push:', e.message); setSyncDot(false); }
}

window.onSectionMarkedComplete = async (sectionId) => {
  if (currentUser && firebaseReady) {
    await pushToFirestore(currentUser.uid);
    if (typeof window.pushLeaderboardScore === 'function')
      window.pushLeaderboardScore(db, currentUser.uid, currentUser);
  }
  checkCertEligibility();
};

// ── Dashboard ───────────────────────────────────
function checkCertEligibility() {
  const p    = getLocalProgress();
  const done = ALL_SECTIONS.filter(s => p[s]).length;
  const pct  = Math.round((done/ALL_SECTIONS.length)*100);
  const banner = document.getElementById('cert-banner');
  if (banner) {
    banner.classList.toggle('show', done === ALL_SECTIONS.length);
    const note = banner.querySelector('.cert-progress-note');
    if (note && done < ALL_SECTIONS.length) note.textContent = `${done}/8 sections complete`;
  }
  // Dashboard
  const dash = document.getElementById('progress-dashboard');
  if (dash && currentUser) {
    const displayName = localStorage.getItem('pokeriq_display_name') || currentUser.displayName || 'Your';
    dash.classList.add('show');
    dash.innerHTML = `
      <div class="dash-title"><span class="sync-dot" style="display:inline-block;margin-right:6px"></span>${displayName} — progress synced</div>
      <div class="dash-grid">
        <div class="dash-stat"><div class="dash-stat-num">${done}</div><div class="dash-stat-label">Sections done</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${8-done}</div><div class="dash-stat-label">Remaining</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${pct}%</div><div class="dash-stat-label">Complete</div></div>
        <div class="dash-stat"><div class="dash-stat-num">${done===8?'🏆':'🎯'}</div><div class="dash-stat-label">${done===8?'Certified!':'Keep going'}</div></div>
      </div>`;
  } else if (dash && !currentUser) {
    dash.classList.remove('show');
  }
}

// ── Certificate — locked until all 8 done ───────
window.openCertModal = function() {
  const p    = getLocalProgress();
  const done = ALL_SECTIONS.filter(s => p[s]).length;
  if (done < ALL_SECTIONS.length) {
    alert(`🔒 Certificate locked!\nComplete all 8 sections first.\nProgress: ${done}/8`);
    return;
  }
  const modal = document.getElementById('cert-modal');
  if (modal) modal.classList.add('open');
  const name = document.getElementById('cert-name-input')?.value
    || localStorage.getItem('pokeriq_display_name')
    || currentUser?.displayName || 'Your Name';
  if (typeof drawCertificate === 'function') drawCertificate(name);
};
window.closeCertModal = function() {
  document.getElementById('cert-modal')?.classList.remove('open');
};

// ── Certificate canvas ──────────────────────────
window.drawCertificate = function(recipientName) {
  const canvas = document.getElementById('cert-canvas');
  if (!canvas) return;
  const W=900, H=636;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle='#fdfaf4'; ctx.fillRect(0,0,W,H);

  // Outer border
  ctx.strokeStyle='#1a2e1a'; ctx.lineWidth=12;
  rrect(ctx,12,12,W-24,H-24,18); ctx.stroke();

  // Gold border
  ctx.strokeStyle='#c9a84c'; ctx.lineWidth=3;
  rrect(ctx,28,28,W-56,H-56,10); ctx.stroke();
  ctx.lineWidth=0.75;
  rrect(ctx,36,36,W-72,H-72,6); ctx.stroke();

  // Corner suits
  [['♠',62,62],['♥',W-62,62],['♦',62,H-62],['♣',W-62,H-62]].forEach(([s,x,y])=>{
    ctx.font='bold 28px Georgia,serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=(s==='♥'||s==='♦')?'#c0392b':'#1a2e1a'; ctx.fillText(s,x,y);
  });

  // Faint suit rows
  const sr=['♠','♥','♦','♣','♠','♥','♦','♣','♠'];
  [54,H-54].forEach(rowY => sr.forEach((s,i)=>{
    ctx.font='18px Georgia,serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=(s==='♥'||s==='♦')?'#c0392b':'#1a2e1a';
    ctx.globalAlpha=0.18; ctx.fillText(s,110+i*85,rowY);
  }));
  ctx.globalAlpha=1;

  // Issuer
  ctx.font='bold 12px DM Sans,Arial,sans-serif'; ctx.fillStyle='#c9a84c';
  ctx.textAlign='center'; ctx.fillText(CERT.issuer.toUpperCase(),W/2,88);
  drule(ctx,W/2,106,240);

  // Certificate of Completion
  ctx.font='13px DM Sans,Arial,sans-serif'; ctx.fillStyle='#9e9990';
  ctx.fillText('CERTIFICATE OF COMPLETION',W/2,132);

  // Course
  ctx.font='italic bold 21px Georgia,serif'; ctx.fillStyle='#2a4a2a';
  ctx.fillText(CERT.course,W/2,165);

  // "This certifies that"
  ctx.font='13px DM Sans,Arial,sans-serif'; ctx.fillStyle='#b0a898';
  ctx.fillText('This certifies that',W/2,210);

  // Name
  const name=(recipientName||'Your Name').trim();
  ctx.font='italic bold 52px Georgia,serif'; ctx.fillStyle='#1a2e1a';
  if (ctx.measureText(name).width>700) ctx.font=`italic bold ${Math.floor(52*700/ctx.measureText(name).width)}px Georgia,serif`;
  ctx.fillText(name,W/2,288);
  const nw=Math.min(ctx.measureText(name).width+80,520);
  ctx.strokeStyle='#c9a84c'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(W/2-nw/2,306); ctx.lineTo(W/2+nw/2,306); ctx.stroke();

  // Completion line
  ctx.font='13px DM Sans,Arial,sans-serif'; ctx.fillStyle='#6b6560';
  ctx.fillText('has successfully completed all 8 modules of',W/2,334);
  ctx.font='bold 19px Georgia,serif'; ctx.fillStyle='#1a2e1a';
  ctx.fillText(CERT.course,W/2,363);
  ctx.font='10.5px DM Sans,Arial,sans-serif'; ctx.fillStyle='#b0a898';
  ctx.fillText('Hand Rankings · Playstyle Types · Odds Calculator · Pot Odds & Equity · Positional Play · Bluffing & Reads · Bankroll Management · Glossary',W/2,386);
  drule(ctx,W/2,408,320);

  // Date
  const today=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  ctx.textAlign='left'; ctx.font='11px DM Sans,Arial,sans-serif'; ctx.fillStyle='#b0a898';
  ctx.fillText('Date of completion',155,438);
  ctx.font='bold 14px DM Sans,Arial,sans-serif'; ctx.fillStyle='#1a2e1a';
  ctx.fillText(today,155,458);
  ctx.strokeStyle='#e0d8c8'; ctx.lineWidth=0.75;
  ctx.beginPath(); ctx.moveTo(155,466); ctx.lineTo(370,466); ctx.stroke();

  // Signature
  ctx.textAlign='right'; ctx.font='11px DM Sans,Arial,sans-serif'; ctx.fillStyle='#b0a898';
  ctx.fillText('Issued by',W-155,438);
  ctx.font='italic bold 22px Georgia,serif'; ctx.fillStyle='#1a2e1a';
  ctx.fillText(CERT.signature,W-155,462);
  ctx.beginPath(); ctx.moveTo(W-370,470); ctx.lineTo(W-115,470); ctx.stroke();

  // Seal
  dseal(ctx,W/2,452);

  // Footer
  ctx.textAlign='center'; ctx.font='9.5px DM Sans,Arial,sans-serif';
  ctx.fillStyle='#c9a84c'; ctx.globalAlpha=0.55;
  ctx.fillText(CERT.website,W/2,H-42);
  ctx.globalAlpha=1;
};

function rrect(ctx,x,y,w,h,r) {
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}
function drule(ctx,cx,y,hw) {
  ctx.strokeStyle='#c9a84c'; ctx.lineWidth=0.75;
  ctx.beginPath(); ctx.moveTo(cx-hw,y); ctx.lineTo(cx-16,y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+16,y); ctx.lineTo(cx+hw,y); ctx.stroke();
  ctx.font='11px Georgia,serif'; ctx.fillStyle='#c9a84c';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('♦',cx,y);
}
function dseal(ctx,cx,cy) {
  ctx.beginPath(); ctx.arc(cx,cy,40,0,Math.PI*2);
  ctx.strokeStyle='#c9a84c'; ctx.lineWidth=2; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,31,0,Math.PI*2);
  ctx.lineWidth=0.75; ctx.stroke();
  ctx.fillStyle='rgba(201,168,76,0.06)'; ctx.fill();
  ctx.font='bold 30px Georgia,serif'; ctx.fillStyle='#1a2e1a';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('♠',cx,cy-3);
  ctx.font='7px DM Sans,Arial,sans-serif'; ctx.fillStyle='#c9a84c';
  ctx.fillText('CERTIFIED',cx,cy+22);
}

// ── Download — locked ───────────────────────────
window.downloadCertificate = function() {
  const p = getLocalProgress();
  const done = ALL_SECTIONS.filter(s => p[s]).length;
  if (done < ALL_SECTIONS.length) {
    alert(`🔒 Complete all 8 sections first!\nProgress: ${done}/8`);
    return;
  }
  const canvas = document.getElementById('cert-canvas');
  if (!canvas) return;
  const name = (document.getElementById('cert-name-input')?.value||'PokerIQ_Certificate').trim().replace(/\s+/g,'_');
  const link = document.createElement('a');
  link.download = name+'_PokerIQ_Certificate.png';
  link.href = canvas.toDataURL('image/png',1.0);
  link.click();
};

// ── Profile update ──────────────────────────────
window.updateUserProfileData = async function(newName, newPhotoURL, newCountry) {
  // Save locally always
  if (newName)    localStorage.setItem('pokeriq_display_name', newName);
  if (newCountry) localStorage.setItem('pokeriq_country', newCountry);
  window.currentUserName = newName || window.currentUserName;

  if (currentUser && firebaseReady) {
    try {
      await updateProfile(auth.currentUser, {
        displayName: newName || currentUser.displayName,
        photoURL: newPhotoURL || currentUser.photoURL || ''
      });
      await setDoc(doc(db,'users',currentUser.uid), {
        displayName: newName, photoURL: newPhotoURL||'', country: newCountry
      }, {merge:true});
      if (typeof window.pushLeaderboardScore === 'function')
        window.pushLeaderboardScore(db, currentUser.uid, auth.currentUser);
    } catch(e) { console.warn('Profile update:', e.message); }
  }

  // Update topbar name
  const nameEl = document.querySelector('.user-name');
  if (nameEl && newName) nameEl.textContent = newName.split(' ')[0];
  // Update avatar
  if (newPhotoURL) {
    const av = document.querySelector('.user-avatar');
    if (av) av.src = newPhotoURL;
  }

  document.getElementById('profile-modal')?.classList.remove('open');
  if (typeof window.showToastMsg === 'function') window.showToastMsg('Profile updated!');
};

// ── DOMContentLoaded ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('cert-name-input');
  if (nameInput) nameInput.addEventListener('input', () => drawCertificate(nameInput.value));
  document.getElementById('cert-modal')?.addEventListener('click', e => {
    if (e.target.id==='cert-modal') closeCertModal();
  });
  checkCertEligibility();
});
