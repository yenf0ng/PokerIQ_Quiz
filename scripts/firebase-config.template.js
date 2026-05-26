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
    apiKey: "AIzaSyC1YLSEFCx-gQGHm1DakSvNkcfFb4rHbyM",
    authDomain: "pokeriq-d89f9.firebaseapp.com",
    projectId: "pokeriq-d89f9",
    storageBucket: "pokeriq-d89f9.firebasestorage.app",
    messagingSenderId: "427514958357",
    appId: "1:427514958357:web:52a15d2adb11204eaa741c",
    measurementId: "G-7DGJWRY73Z"
};

// ── Customise your certificate branding ───────
// These appear printed on the certificate
window.CERT_CONFIG = {
  issuer:    "PokerIQ Academy",       // top of certificate
  course:    "Texas Hold'em Mastery", // course title
  signature: "PokerIQ",              // signature / issued by line
  website:   "yenf0ng.github.io/PokerIQ_Quiz" // footer URL
};
