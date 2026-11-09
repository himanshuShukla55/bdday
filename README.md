# A Little Book For Pum

An iPhone-first hardcover book for Aastha: You, Love, and Wishes & Dreams. Includes a cloth-bound cover, paper pages, measured text pagination, physical page turns using StPageFlip, a ribbon chapter index, and adjustable reading size. Phones show a single page; wide screens show a spread. Chapters are text-only, with a consistent burgundy accent and a cover-style flower on every chapter-title page. There is no interactive wish, candle, or confetti finale.

## Run

```sh
npm install
npm run dev
```

## Make It Yours

- All chapter content lives in `src/chapters.js`. The dedication and all three chapters are personalized from the author's notes. Wishes & Dreams keeps the internal `dreams` ID for navigation continuity.
- Fears and Good Wishes have been removed. The book has three chapters, each with a continuous prose flow.
- Edit `dedication` for the opening note. Each chapter has paragraphs, a salutation, and a signoff; an optional `epigraph` appears on its title page.
- Typography, paper, and cover styling live in `src/hardcover.css`. The book, pagination, and understated final inscription live in `src/Hardcover.jsx`.

The ribbon opens bookmark controls; the bottom-left book button still opens the chapter index. There is one bookmark: saving a new place replaces the old one. A paragraph-and-word anchor is stored under `pum-bookmark-v1` in localStorage, so it survives tab closures and still resolves after text-size or viewport changes. The ribbon remains available on the cover when a bookmark exists. Use Go to bookmark to return, or Remove bookmark to clear it. Saving is explicit, not automatic.

Bookmarks stay in the same browser and site address, not across devices, and can be lost when browser data is cleared. Private browsing may clear storage when its session ends. Storage failures are shown rather than claiming a save succeeded. Reading preferences stay only in page memory. There are no analytics or accounts. Google Fonts receives normal asset requests, so fonts need an internet connection. No external photos are requested.

The main layout targets the iPhone 15's 393 x 852 CSS viewport, accommodates safe areas, and uses 44px controls. Text is measured after fonts load and repaginated for viewport or reading-size changes, preserving the current passage. Page arrows, touch swipes, and keyboard arrows turn pages; reduced motion uses instant button and keyboard turns. A physical iPhone Safari check is still needed; viewport emulation is not a substitute for one.

## Build And Share

```sh
npm run build
npm run preview
```

Deploy the generated `dist` directory to a static host such as Netlify, Vercel, or GitHub Pages. If hosting under a subdirectory, configure Vite's `base` for that path before building. The local development URL is not a public sharing link.