// ╔══════════════════════════════════════════════════════════╗
// ║  STEP 1: Copy this file and rename it firebase-config.js ║
// ║  STEP 2: Fill in your values from Firebase console       ║
// ║  STEP 3: firebase-config.js is in .gitignore — safe ✓   ║
// ╚══════════════════════════════════════════════════════════╝
//
// Get these values from:
// Firebase Console → Project Settings → Your apps → Web app → SDK setup
//
// HOW TO RESTRICT YOUR KEY (important!):
// Google Cloud Console → APIs & Credentials → your API key
// → Application restrictions → HTTP referrers
// → Add: yenf0ng.github.io/*  and  localhost/*

window.FIREBASE_CONFIG = {
  apiKey:            "PASTE_YOUR_API_KEY_HERE",
  authDomain:        "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "PASTE_YOUR_PROJECT_ID",
  storageBucket:     "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId:             "PASTE_YOUR_APP_ID"
};

// ── Customise your certificate branding ───────
// These appear printed on the certificate
window.CERT_CONFIG = {
  issuer:    "PokerIQ Academy",       // top of certificate
  course:    "Texas Hold'em Mastery", // course title
  signature: "PokerIQ",              // signature / issued by line
  website:   "yenf0ng.github.io/PokerIQ_Quiz" // footer URL
};
