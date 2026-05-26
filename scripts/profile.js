// ══════════════════════════════════════════════
//  PokerIQ — Profile Customization + Country
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
window.COUNTRY_FLAGS = COUNTRY_FLAGS;

// ── Avatar colors ──────────────────────────────
const AVATAR_COLORS = [
  {bg:'#1a2e1a',text:'#c9a84c',label:'Forest Gold'},
  {bg:'#1e3a5f',text:'#7fb3e8',label:'Ocean Blue'},
  {bg:'#5f1e1e',text:'#e87f7f',label:'Ruby Red'},
  {bg:'#3a1e5f',text:'#b07fe8',label:'Royal Purple'},
  {bg:'#1e4a3a',text:'#7fe8c4',label:'Emerald'},
  {bg:'#5f4a1e',text:'#e8c47f',label:'Desert Sand'},
  {bg:'#4a1e3a',text:'#e87fb0',label:'Rose'},
  {bg:'#1e3a3a',text:'#7fe8e8',label:'Arctic Teal'}
];
window.AVATAR_COLORS = AVATAR_COLORS;

// ── Open/close profile modal ───────────────────
window.openProfileModal = function() {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;
  // Populate current values
  const nameInput = document.getElementById('profile-name-input');
  const currentName = localStorage.getItem('pokeriq_display_name') || window.currentUserName || '';
  if (nameInput) nameInput.value = currentName;

  buildCountrySelect();
  buildAvatarPicker();
  updateProfilePreview();
  modal.classList.add('open');
};
window.closeProfileModal = function() {
  document.getElementById('profile-modal')?.classList.remove('open');
};

// ── Save profile ───────────────────────────────
window.saveProfile = async function() {
  const nameInput  = document.getElementById('profile-name-input');
  const countryEl  = document.getElementById('profile-country-select');
  const photoInput = document.getElementById('profile-photo-input');

  const newName    = nameInput?.value?.trim() || window.currentUserName || 'Player';
  const newCountry = countryEl?.value || 'Other';

  // Save locally
  localStorage.setItem('pokeriq_display_name', newName);
  localStorage.setItem('pokeriq_country', newCountry);

  // Handle photo upload (base64 stored locally)
  if (photoInput?.files?.length) {
    const file = photoInput.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      localStorage.setItem('pokeriq_custom_photo', e.target.result);
      window.currentUserPhoto = e.target.result;
      applyProfileToUI();
    };
    reader.readAsDataURL(file);
  }

  // Handle avatar color pick
  const selectedColor = document.querySelector('.avatar-color-btn.selected');
  if (selectedColor) {
    const idx = parseInt(selectedColor.dataset.idx);
    localStorage.setItem('pokeriq_avatar_color', idx);
  }

  window.currentUserName = newName;

  // Update Firebase display name if signed in
  if (window._auth && window._currentUser) {
    try {
      const { updateProfile } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      await updateProfile(window._currentUser, { displayName: newName });
    } catch(e) { console.warn('Firebase name update failed:', e.message); }
  }

  // Push to leaderboard
  if (window._db && window.currentUserId) {
    if (typeof window.pushLeaderboardScore === 'function') {
      window.pushLeaderboardScore(window._db, window.currentUserId, {
        displayName: newName, photoURL: window.currentUserPhoto
      });
    }
  }

  applyProfileToUI();
  closeProfileModal();
  showToast('Profile saved!');
};

// ── Apply saved profile to UI ──────────────────
window.applyProfileToUI = function() {
  const name    = localStorage.getItem('pokeriq_display_name') || window.currentUserName || '';
  const country = localStorage.getItem('pokeriq_country') || '';
  const photo   = localStorage.getItem('pokeriq_custom_photo') || window.currentUserPhoto || '';
  const colorIdx= parseInt(localStorage.getItem('pokeriq_avatar_color') || '0');
  const color   = AVATAR_COLORS[colorIdx] || AVATAR_COLORS[0];

  // Update topbar name
  const nameEl = document.querySelector('.user-name');
  if (nameEl && name) nameEl.textContent = name.split(' ')[0];

  // Update topbar avatar
  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl && photo) { avatarEl.src = photo; avatarEl.style.display = 'block'; }
};

// ── Profile preview ────────────────────────────
window.updateProfilePreview = function() {
  const preview = document.getElementById('profile-preview');
  if (!preview) return;
  const name     = document.getElementById('profile-name-input')?.value || 'Player';
  const country  = document.getElementById('profile-country-select')?.value || 'Other';
  const colorIdx = parseInt(document.querySelector('.avatar-color-btn.selected')?.dataset?.idx || '0');
  const color    = AVATAR_COLORS[colorIdx] || AVATAR_COLORS[0];
  const photo    = localStorage.getItem('pokeriq_custom_photo') || window.currentUserPhoto || '';
  const flag     = COUNTRY_FLAGS[country] || '🌍';
  const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || 'P';

  preview.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;padding:1rem;background:var(--bg);border-radius:var(--radius);border:1px solid var(--border)">
      ${photo
        ? `<img src="${photo}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid ${color.bg}">`
        : `<div style="width:48px;height:48px;border-radius:50%;background:${color.bg};color:${color.text};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0">${initials}</div>`}
      <div>
        <div style="font-weight:600;font-size:0.95rem;color:var(--text)">${name||'Your Name'}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">${flag} ${country}</div>
      </div>
    </div>`;
};

// ── Build UI helpers ───────────────────────────
window.buildCountrySelect = function() {
  const sel = document.getElementById('profile-country-select') || document.getElementById('country-select');
  if (!sel) return;
  const saved = localStorage.getItem('pokeriq_country') || 'Malaysia';
  sel.innerHTML = Object.entries(COUNTRY_FLAGS).map(([name,flag]) =>
    `<option value="${name}" ${name===saved?'selected':''}>${flag} ${name}</option>`
  ).join('');
};

window.buildAvatarPicker = function() {
  const el = document.getElementById('avatar-color-grid');
  if (!el) return;
  const saved = parseInt(localStorage.getItem('pokeriq_avatar_color') || '0');
  el.innerHTML = AVATAR_COLORS.map((c,i) => `
    <button class="avatar-color-btn ${i===saved?'selected':''}" data-idx="${i}"
      style="width:36px;height:36px;border-radius:50%;background:${c.bg};border:${i===saved?'3px solid var(--accent)':'2px solid transparent'};cursor:pointer;transition:border 0.15s"
      onclick="selectAvatarColor(${i})" title="${c.label}">
    </button>`).join('');
};

window.selectAvatarColor = function(idx) {
  document.querySelectorAll('.avatar-color-btn').forEach((btn,i) => {
    const c = AVATAR_COLORS[i];
    btn.style.border = i===idx ? '3px solid var(--accent)' : '2px solid transparent';
    btn.classList.toggle('selected', i===idx);
  });
  updateProfilePreview();
};

// ── Toast notification ─────────────────────────
window.showToast = function(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--felt);color:var(--accent);padding:0.5rem 1.25rem;border-radius:20px;font-size:0.85rem;font-weight:500;z-index:400;opacity:0;transition:opacity 0.2s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 2200);
};

// ── Country save (leaderboard button) ─────────
window.saveCountry = function() {
  const sel = document.getElementById('country-select');
  if (!sel) return;
  localStorage.setItem('pokeriq_country', sel.value);
  closeCountryPicker();
  if (window._db && window.currentUserId) {
    if (typeof window.pushLeaderboardScore === 'function') {
      window.pushLeaderboardScore(window._db, window.currentUserId, {
        displayName: window.currentUserName,
        photoURL: window.currentUserPhoto
      });
    }
    if (typeof window.loadLeaderboard === 'function') window.loadLeaderboard(window._db);
  }
  showToast('Country saved!');
};

window.openCountryPicker = function() {
  buildCountrySelect();
  document.getElementById('country-modal')?.classList.add('open');
};
window.closeCountryPicker = function() {
  document.getElementById('country-modal')?.classList.remove('open');
};
