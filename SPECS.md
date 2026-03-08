# #tr33via — Product & Design Specifications

> The vault of mind-blowing facts. A premium editorial webapp for deeply researched, story-driven long-form trivia articles.

---

## 1. Identity

| Property | Value |
|---|---|
| Brand Name | `#tr33via` |
| Tagline | *The vault of mind-blowing facts* |
| Logo Treatment | `#` in crimson · `3`s in gold · rest in warm cream · IBM Plex Mono |
| Personality | Hacker-editorial. Smart. Obsessive. Cinematic. |
| Color Mood | Charcoal & Crimson Gold |

---

## 2. Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0C0A0A` | Page background |
| `--surface` | `#141010` | Cards, panels |
| `--surface-2` | `#1C1515` | Elevated surfaces |
| `--border` | `#2A2020` | Dividers, card borders |
| `--accent-gold` | `#D4760A` | Primary accent, CTAs, highlights |
| `--accent-red` | `#8B1A1A` | Secondary accent, brand mark `#` |
| `--accent-glow` | `#E8920C` | Hover glows, progress bars |
| `--text-primary` | `#F0E8D8` | Body copy |
| `--text-secondary` | `#9A8070` | Metadata, subtitles |
| `--text-accent` | `#D4760A` | Accented text elements |

### Light Mode Overrides
| Token | Hex |
|---|---|
| `--bg` | `#F8F5F0` |
| `--surface` | `#FFFFFF` |
| `--surface-2` | `#F0EBE3` |
| `--border` | `#E0D5C8` |
| `--text-primary` | `#1A1410` |
| `--text-secondary` | `#6B5A4A` |

---

## 3. Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Brand / UI labels | IBM Plex Mono | 400–500 | 13–16px |
| Article headlines | Cormorant Garamond | 700–900 | 32–56px |
| Article body | Spectral | 400–600 | 19–21px / 1.85 line-height |
| Pull quotes | Cormorant Garamond | 400 italic | 24–28px |
| Tags / badges | IBM Plex Mono | 500 uppercase | 11–13px |

**Google Fonts import:** `IBM Plex Mono` (400, 500) · `Cormorant Garamond` (400, 700, 900) · `Spectral` (400, 400i, 600)

---

## 4. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Vite + React | JSX, no TypeScript |
| Routing | React Router v6 | Hash-based for static deploy compat |
| Styling | Pure CSS + CSS variables | No Tailwind — full aesthetic control |
| Markdown rendering | `react-markdown` | Article body content |
| Animations | CSS keyframes + JS scroll detection | No external animation lib |
| Deployment | Vercel / Netlify | `npm run build` → `dist/` drag-drop |

---

## 5. Project Structure

```
Trivia-Vault/
├── package.json
├── vite.config.js
├── index.html
├── .gitignore
├── SPECS.md                        ← This file
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── pages/
│   │   ├── Landing.jsx             ← Homepage: hero + card grid
│   │   └── Article.jsx             ← Article reader page
│   ├── components/
│   │   ├── Navbar.jsx              ← Brand mark + nav + search icon
│   │   ├── SpotlightHero.jsx       ← Auto-rotating featured article hero
│   │   ├── ArticleCard.jsx         ← Card used in the article grid
│   │   ├── SearchBar.jsx           ← Inline search filter
│   │   ├── ReadingProgress.jsx     ← Thin gold scroll progress bar
│   │   ├── ArticleNav.jsx          ← Prev / Next navigation at article end
│   │   └── Footer.jsx              ← Shared footer
│   ├── data/
│   │   └── articles.js             ← All metadata + full markdown content
│   └── styles/
│       ├── index.css               ← CSS variables, reset, global typography
│       ├── landing.css             ← Landing page layout + card grid
│       └── article.css             ← Article reader typography + components
└── Articles Docs/                  ← Source PDFs/MDs (not served)
```

---

## 6. Page Specifications

### 6.1 Landing Page (`/`)

#### Navbar
- Sticky, `--bg` background, 1px `--border` bottom
- Left: `#tr33via` brand mark — `#` in `--accent-red`, `3`s in `--accent-gold`, rest in `--text-primary`, IBM Plex Mono
- Right: search icon (🔍) + article count pill e.g. `12 articles`
- Mobile: same layout, no hamburger needed

#### Spotlight Hero (`SpotlightHero.jsx`)
- Full viewport height (`100vh`)
- Full-bleed background gradient from active article's `themeGradient` — smooth CSS transition on change
- **Desktop layout (60/40 split):**
  - Left 60%: large article gradient card with article number badge (`01`, `02`…), subtle inner shadow
  - Right 40%: category tag → title (Cormorant) → subtitle → description → read time → `Read Article →` CTA button
- **Mobile layout:** image panel top (40vh), text panel below
- **Bottom strip:** row of article mini-thumbnails; active article shows gold border + brighter opacity
- **Auto-rotation:** every 5 seconds, 700ms crossfade; pauses on hover
- **Grid sync:** whichever article is in the spotlight also gets a gold left-border + glow on its card in the grid below

#### Articles Section
- Section label: `— The Vault —` centered, IBM Plex Mono, `--text-secondary`
- Full-width search input (real-time filter by title + keywords), gold focus ring
- Category filter pills: `All` · `AI & Infrastructure` · `Companies & Corporations` · `Science & Technology`
- Card grid: `repeat(auto-fill, minmax(340px, 1fr))`, gap 24px
- Mobile: single column, 100% width

#### Article Card (`ArticleCard.jsx`)
```
┌──────────────────────────────────────┐
│  [Article gradient — 200px tall]      │
│                    [Category tag] ──► │
├──────────────────────────────────────┤
│  ARTICLE TITLE  (Cormorant, 22px)     │
│  Subtitle line  (Spectral, 13px)      │
│  ·· xAI  ·  Colossus  ·  Grok ··    │
│  Description, max 2 lines (14px)      │
│  ⏱ 22 min read         [Read →]      │
└──────────────────────────────────────┘
```
- Background: `--surface`, border: `--border`
- Hover: `translateY(-4px)`, gold left border (4px), image brightness +10%, smooth 200ms ease
- Spotlight active state: gold left border + `box-shadow: 0 0 0 1px var(--accent-gold)`

#### Footer
- 3-column layout: brand blurb · quick links · "More articles coming soon"
- `--surface` background, 1px `--border` top
- Mobile: stacked single column

---

### 6.2 Article Page (`/article/:id`)

#### Reading Progress Bar (`ReadingProgress.jsx`)
- Fixed at very top of page, `z-index: 1000`
- 3px tall, gold fill (`--accent-glow`)
- Width tracks scroll position via JS `(scrollY / (scrollHeight - windowHeight)) * 100`

#### Dark / Light Mode Toggle
- Fixed top-right, above all content
- Toggles `data-theme` attribute on `<html>` element between `dark` and `light`
- Icon: 🌙 for dark mode, ☀️ for light mode
- State persisted to `localStorage`

#### Back Button
- Fixed top-left: `← Back to Vault` — IBM Plex Mono, small, `--text-secondary`
- Does not overlap article text on mobile

#### Article Hero
- Full-bleed gradient (article's `themeGradient`), 60vh tall
- Bottom: gradient fades to transparent → blends into `--bg`
- Overlaid text: category tag → article title (Cormorant, 56px desktop / 36px mobile) → subtitle
- No separate image block needed — gradient IS the hero

#### Meta Strip
```
📖  4,850 words  ·  22 min read  ·  March 2026  ·  AI & Infrastructure
```
- IBM Plex Mono, 13px, `--text-secondary`
- Sits below the hero, above body content

#### Article Body
- Container: `max-width: 720px`, centered, `padding: 0 24px`
- Font: Spectral 400, 20px, line-height 1.85
- **`h2` (section headers):** Cormorant Garamond 700, 32px, 4px left border in `--accent-gold`, `margin-top: 64px` — styled as chapter titles
- **`p`:** 20px / 1.85 LH — generous, readable
- **`blockquote`:** Cormorant Garamond italic, 26px, 4px left border `--accent-gold`, left-indented — pull quotes
- **`strong`:** color `--accent-gold`, weight 600
- **`hr`:** 1px `--accent-gold` border, 40% width, centered
- **`em`:** italic

#### Article Navigation (`ArticleNav.jsx`)
- Fades in when reader has scrolled ≥ 90% of article
- Two side-by-side cards: ← Previous Article / Next Article →
- Each card: mini gradient thumbnail + article title
- Full-width on mobile (stacked vertically)

---

## 7. Article Data Schema

```js
{
  id: String,           // URL slug, e.g. 'xai-colossus'
  title: String,        // Short display title, e.g. 'The Electric God'
  subtitle: String,     // Full descriptive headline
  category: String,     // One of the defined categories
  keywords: String[],   // Max 5 tags shown on card
  description: String,  // 2–3 sentence blurb for card
  readTime: String,     // e.g. '22 min read'
  wordCount: Number,
  publishDate: String,  // e.g. 'March 2026'
  themeGradient: String,// CSS gradient string for image placeholder
  image: String|null,   // Path to image when provided; null = use gradient
  content: String       // Full markdown article body (stripped)
}
```

### Defined Categories
- `AI & Infrastructure`
- `Companies & Corporations`
- `Science & Technology`

---

## 8. Content Processing Rules

Every article `.md` delivered from Perplexity follows this format:

```
[Perplexity logo img tag]
# Prompt text...
[Research instructions...]
OUTPUT INSTRUCTIONS...
***
# Actual Article Title
[Article body...]
[Section headers...]
[Closing paragraph]
<span style="display:none">[^1][^2]...</span>
<div align="center">⁂</div>
[^1]: url
[^2]: url
...
```

**Processing:**
1. ✂️ **Strip top block** — discard everything from line 1 up to and including the `***` separator
2. ✂️ **Strip bottom block** — discard the hidden `<span>` footnote reference block, the `<div align="center">⁂</div>`, and all `[^N]: url` lines
3. ✅ **Keep** — everything from `# Article Title` through the final paragraph of the closing section
4. Insert cleaned content into `articles.js` as a template literal string value for `content`

---

## 9. Article Roster

### Article 1 — Live at Launch
| Field | Value |
|---|---|
| ID | `xai-colossus` |
| Title | The Electric God |
| Subtitle | How Elon Musk Built the World's Most Powerful AI Brain in 122 Days — And What It Cost |
| Category | AI & Infrastructure |
| Keywords | xAI · Colossus · Elon Musk · Grok · Supercomputer |
| Word count | ~4,850 |
| Read time | 22 min |
| Theme gradient | `radial-gradient(ellipse at 30% 40%, #8B1A1A 0%, #D4760A 40%, #0C0A0A 75%)` |
| Image | `null` (gradient placeholder until image provided) |

### Articles 2 & 3
To be provided by owner. Will follow the same `.md` format and content processing rules above.

---

## 10. Responsive Breakpoints

| Viewport | Behavior |
|---|---|
| `> 1024px` | 3-column card grid · 60/40 spotlight split · article body 720px centered |
| `768px – 1024px` | 2-column grid · stacked spotlight (image above text) · article body full-width |
| `< 768px` | 1-column grid · full-width spotlight · article body full-width · font sizes reduced |

---

## 11. Build & Deploy

```bash
# Development
npm install
npm run dev          # → http://localhost:5173

# Production build
npm run build        # → dist/ folder

# Deploy
# Drag dist/ to Vercel dashboard
# OR: vercel deploy --prod
```

---

*Specs last updated: March 2026*
