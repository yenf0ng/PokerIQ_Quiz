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

## Deploy to GitHub Pages

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

Built for learning. Good luck at the tables. ♠♥♦♣
