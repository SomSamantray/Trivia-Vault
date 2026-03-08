# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server → http://localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
vercel deploy --prod # Deploy to production
```

## What This Project Is

**#tr33via** — a long-form investigative article vault. Dark editorial webapp where users discover and read deeply researched trivia/facts articles told as narratives. Think Wired deep-dive meets curated digital magazine.

Full design specs live in `SPECS.md`. That file is the source of truth for all design decisions.

## Architecture

**Stack:** Vite + React (JSX, no TypeScript) · React Router v6 (hash-based) · Pure CSS with CSS variables · `react-markdown` for article bodies · no UI component library, no Tailwind.

**Two routes:**
- `/` → `src/pages/Landing.jsx` — spotlight hero + searchable card grid
- `/article/:id` → `src/pages/Article.jsx` — full article reader

**Data layer:** All article metadata and full markdown content live in `src/data/articles.js` as a single exported array. There is no backend, no API, no database — everything is static.

**Styling architecture:** Three CSS files imported globally:
- `src/styles/index.css` — CSS custom properties (design tokens), reset, Google Fonts import, global typography
- `src/styles/landing.css` — landing page layout only
- `src/styles/article.css` — article reader typography and components

All theming is done via CSS variables on `:root` (dark mode default). Light mode overrides are applied via `html[data-theme="light"]`. Theme state is persisted in `localStorage`.

## Design Tokens (Do Not Deviate)

```css
--bg: #0C0A0A          --accent-gold: #D4760A
--surface: #141010     --accent-red: #8B1A1A
--surface-2: #1C1515   --accent-glow: #E8920C
--border: #2A2020      --text-primary: #F0E8D8
                       --text-secondary: #9A8070
```

**Fonts:** IBM Plex Mono (brand/UI) · Cormorant Garamond (article headlines) · Spectral (article body). Never substitute these.

## SpotlightHero Behaviour

The hero section (`src/components/SpotlightHero.jsx`) is the most complex component:
- Cycles through all articles every 5 seconds (pauses on hover)
- Background gradient transitions to match the active article's `themeGradient`
- The active article's card in the grid below receives a gold left-border highlight — this sync is driven by a shared `activeSpotlightId` state lifted into `Landing.jsx` and passed down to both `SpotlightHero` and `ArticleCard`

## Adding a New Article

1. Get the `.md` file from Perplexity
2. **Strip top:** delete everything from line 1 through the `***` separator (prompt + instructions)
3. **Strip bottom:** delete the hidden `<span>[^1]...</span>` block, `<div align="center">⁂</div>`, and all `[^N]: url` footnote lines
4. Add an entry to `src/data/articles.js` with the cleaned markdown as the `content` field
5. Choose a `themeGradient` CSS string that reflects the article's topic/mood
6. Set `image: null` until a real image is provided (renders gradient placeholder)

Article schema:
```js
{
  id, title, subtitle, category, keywords[],
  description, readTime, wordCount, publishDate,
  themeGradient, image, content
}
```

Valid categories: `AI & Infrastructure` · `Companies & Corporations` · `Science & Technology`

## Article Content Rendering

`src/pages/Article.jsx` renders the `content` string via `react-markdown`. Markdown elements map to styled classes in `article.css`:
- `h2` → chapter title style (Cormorant, gold left border)
- `blockquote` → pull quote style (Cormorant italic, large)
- `strong` → gold-tinted text
- `hr` → thin gold separator line

## Image Handling

`image: null` on an article renders a CSS gradient (`themeGradient`) as the visual. When a real image is provided, set `image: '/images/filename.jpg'` and place the file in `public/images/`. The gradient is always kept as a fallback.
