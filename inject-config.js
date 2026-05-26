// inject-config.js — runs at Netlify build time
// Reads environment variables and writes scripts/firebase-config.js

const fs   = require('fs');
const path = require('path');

const cfg = {
  apiKey:            process.env.FIREBASE_API_KEY             || '',
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN         || '',
  projectId:         process.env.FIREBASE_PROJECT_ID          || '',
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET      || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.FIREBASE_APP_ID              || ''
};

const cert = {
  issuer:    process.env.CERT_ISSUER    || 'PokerIQ Academy',
  course:    process.env.CERT_COURSE    || "Texas Hold'em Mastery",
  signature: process.env.CERT_SIGNATURE || 'PokerIQ',
  website:   process.env.CERT_WEBSITE   || 'pokeriqs.netlify.app'
};

const missing = Object.entries(cfg).filter(([,v]) => !v).map(([k]) => k);
if (missing.length) {
  console.warn('Warning: missing env vars:', missing.join(', '));
}

// Encode as base64 so raw key strings don't appear in the output file
// The browser decodes them at runtime
const encoded = Buffer.from(JSON.stringify(cfg)).toString('base64');
const certEncoded = Buffer.from(JSON.stringify(cert)).toString('base64');

const output = `// Auto-generated at build time — do not edit
(function(){
  try {
    window.FIREBASE_CONFIG = JSON.parse(atob("${encoded}"));
    window.CERT_CONFIG = JSON.parse(atob("${certEncoded}"));
  } catch(e) {
    console.warn('Config decode failed:', e);
  }
})();
`;

fs.writeFileSync(path.join(__dirname, 'scripts', 'firebase-config.js'), output);
console.log('✅ firebase-config.js written (base64 encoded)');
console.log('   Project:', cfg.projectId || '(not set)');
