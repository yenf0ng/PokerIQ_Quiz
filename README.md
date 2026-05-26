# PokerIQ — Texas Hold'em Mastery

A free, interactive Texas Hold'em learning website for casual players who want to improve their game. No signup, no ads, no fluff.

## Features

- **8 Learning Sections** — Hand Rankings, Playstyle Types, Odds Calculator, Pot Odds & Equity, Positional Play, Bluffing & Reads, Bankroll Management, Glossary
- **Interactive Poker Odds Calculator** — Monte Carlo equity simulation vs one opponent
- **Hand Strength Tester** — Identify randomly dealt 5-card hands
- **Per-section Quizzes** — 4 questions each with instant feedback
- **Progress Tracker** — Marks sections complete, persists via localStorage
- **Searchable Glossary** — 50+ poker terms defined
- **Mobile Responsive** — Works on all screen sizes

## File Structure

```
pokeriq/
├── index.html          # Single entry point
├── styles/
│   └── main.css        # All styles
├── scripts/
│   └── main.js         # All JavaScript
└── README.md
```

<<<<<<< HEAD
## Local Development

No build tools needed. Just open `index.html` in your browser:

```bash
# Option 1: Direct open
open index.html

# Option 2: Simple local server (Python)
python3 -m http.server 8080
# Then visit http://localhost:8080

# Option 3: VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

## Setting up Firebase (Google Sign-In + Progress Sync)

### Step 1 — Create a Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `pokeriq` → Continue
3. Disable Google Analytics (optional) → Create project

### Step 2 — Enable Google Sign-In
1. In your project → **Authentication** → **Get started**
2. Under **Sign-in method** → enable **Google** → Save

### Step 3 — Create Firestore database
1. In your project → **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for development)
3. Select a region → Enable

### Step 4 — Get your web app config
1. Project Overview → click **</>** (web app) → Register app
2. Copy the `firebaseConfig` object shown
3. Paste it into `scripts/auth.js` replacing the `YOUR_*` placeholders

### Step 5 — Set Firestore security rules
In Firestore → **Rules**, replace with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Click **Publish**.

### Step 6 — Customise your certificate
In `scripts/auth.js`, edit the three branding constants at the top:
```js
const CERT_ISSUER    = "PokerIQ Academy";     // shown at top
const CERT_COURSE    = "Texas Hold'em Mastery"; // course title
const CERT_SIGNATURE = "PokerIQ";              // signature line
```



### Step 1 — Create a GitHub repository

1. Go to [github.com](https://github.com) and sign in
2. Click **New repository** (the `+` button, top right)
3. Name it `pokeriq` (or any name you like)
4. Set it to **Public**
5. Click **Create repository**

### Step 2 — Push your code

```bash
# In your project folder:
git init
git add .
git commit -m "Initial commit — PokerIQ site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pokeriq.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. In your repository, click **Settings**
2. Scroll down to **Pages** in the left sidebar
3. Under **Source**, select **Deploy from a branch**
4. Set branch to `main`, folder to `/ (root)`
5. Click **Save**

### Step 4 — Access your site

After 1-2 minutes, your site will be live at:

```
https://YOUR_USERNAME.github.io/pokeriq/
```

GitHub will show a green banner in Settings → Pages when it's ready.

## Customisation

- **Site name**: Search and replace `PokerIQ` in `index.html`
- **Colours**: Edit CSS variables in `:root` at the top of `styles/main.css`
- **Quiz questions**: Edit the `quizData` object in `scripts/main.js`
- **Glossary terms**: Add new `<div class="glossary-term">` entries in `index.html`
- **New sections**: Add a nav item, a `section-page` div, and quiz data entry

## Tech Stack

- Pure HTML5, CSS3, Vanilla JavaScript
- Google Fonts (Playfair Display + DM Sans + DM Mono)
- No frameworks, no build tools, no dependencies
- localStorage for progress persistence

---

=======
>>>>>>> 20bc618bcc3a491280bebe810bec5b4b89b18c6f
Built for learning. Good luck at the tables. ♠♥♦♣
