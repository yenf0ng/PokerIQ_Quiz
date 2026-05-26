# PokerIQ — Texas Hold'em Mastery

A free, interactive Texas Hold'em learning website. No framework, no build tools — pure HTML, CSS, and JavaScript. Deploys directly to GitHub Pages.

## Features

- 8 learning sections with full content
- Interactive poker odds calculator (Monte Carlo simulation)
- Hand strength tester
- Per-section quizzes (4 questions each)
- Progress tracker (localStorage + Firestore cloud sync)
- Google Sign-In
- Downloadable certificate (Canvas-generated PNG)
- Searchable glossary (50+ terms)
- Mobile responsive

## File structure

```
PokerIQ_Quiz/
├── index.html                          ← single entry point
├── styles/
│   ├── main.css                        ← all site styles
│   └── auth.css                        ← auth + certificate styles
├── scripts/
│   ├── main.js                         ← site logic, quizzes, calculator
│   ├── auth.js                         ← Firebase auth + certificate generator
│   ├── firebase-config.template.js     ← copy this → firebase-config.js
│   └── firebase-config.js              ← YOUR config (gitignored, never pushed)
├── .gitignore                          ← keeps firebase-config.js off GitHub
└── README.md
```

---

## 1 — Deploy to GitHub Pages

```bash
git add .
git commit -m "PokerIQ update"
git push origin main
```

Then: **Repo → Settings → Pages → Deploy from branch → main → / (root) → Save**

Your site: `https://yenf0ng.github.io/PokerIQ_Quiz/`

---

## 2 — Set up Firebase (Google Sign-In + progress sync)

### Create the project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → name it `pokeriq` → Continue
3. Disable Google Analytics → **Create project**

### Enable Google Sign-In
1. Left sidebar → **Authentication** → **Get started**
2. **Sign-in method** tab → click **Google** → toggle Enable
3. Set a support email → **Save**

### Create Firestore database
1. Left sidebar → **Firestore Database** → **Create database**
2. Choose **Start in test mode** → Next
3. Pick region `asia-southeast1` (Malaysia) → **Enable**

### Get your web app config
1. **Project Overview** → gear icon → **Project settings**
2. Scroll to **Your apps** → click **</>** web icon
3. App nickname: `pokeriq-web` → **Register app**
4. Copy the `firebaseConfig` object

### Add your config file locally
```bash
# In your project folder:
cp scripts/firebase-config.template.js scripts/firebase-config.js
```
Open `scripts/firebase-config.js` and paste your values:
```js
window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",          // ← your real values
  authDomain:        "pokeriq-xxxxx.firebaseapp.com",
  projectId:         "pokeriq-xxxxx",
  storageBucket:     "pokeriq-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abcdef"
};

window.CERT_CONFIG = {
  issuer:    "PokerIQ Academy",        // ← change to your brand
  course:    "Texas Hold'em Mastery",
  signature: "PokerIQ",
  website:   "yenf0ng.github.io/PokerIQ_Quiz"
};
```

> **Note:** `firebase-config.js` is in `.gitignore` — it will NEVER be pushed to GitHub. This keeps your API key private.

### Restrict your API key (important)
1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Click your API key → **Application restrictions** → HTTP referrers
3. Add these:
   ```
   yenf0ng.github.io/*
   localhost/*
   127.0.0.1/*
   ```
4. **Save** — now the key is useless on any other domain

### Set Firestore security rules
1. Firestore → **Rules** tab → replace with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```
2. Click **Publish**

### Authorise your GitHub Pages domain
1. Firebase → **Authentication** → **Settings** tab
2. Scroll to **Authorised domains** → **Add domain**
3. Add: `yenf0ng.github.io`
4. **Add**

---

## 3 — Local development

```bash
# Python (easiest)
python3 -m http.server 8080
# Visit http://localhost:8080

# Node
npx serve .
```

> You must use a local server (not just open index.html directly) because
> Firebase Auth requires a proper HTTP origin.

---

## 4 — Customise the certificate

In `scripts/firebase-config.js`, edit `window.CERT_CONFIG`:

```js
window.CERT_CONFIG = {
  issuer:    "Your Academy Name",   // printed at the top
  course:    "Your Course Name",    // course title line
  signature: "Your Name",          // signature / issued by
  website:   "your-site.github.io" // footer URL
};
```

The certificate preview updates live as you type your name in the modal.

---

## 5 — Common errors

| Error | Cause | Fix |
|---|---|---|
| `auth/unauthorized-domain` | GitHub Pages not in allowed list | Auth → Settings → Authorised domains → add `yenf0ng.github.io` |
| `Missing or insufficient permissions` | Firestore rules wrong | Re-paste rules from Step 2 and Publish |
| `Firebase: Error (auth/api-key-not-valid)` | Wrong API key | Check your `firebase-config.js` values |
| Sign-in popup blocked | Browser blocked popup | Allow popups for your site |
| Site shows 404 on GitHub Pages | Pages not configured | Settings → Pages → Deploy from branch → main → / (root) |
| Firebase config not found | `firebase-config.js` missing | Copy from template and fill in values |

---

## Security summary

| Layer | Protection |
|---|---|
| `.gitignore` | API key never pushed to GitHub |
| API key restriction | Key only works on your domain |
| Firestore rules | Users can only access their own data |
| Firebase Auth | Unauthenticated requests blocked |

