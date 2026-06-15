# Gym Master — Real-Time Feedback Form

A complete, self-contained feedback page for the Gym Master gym management platform. Open `index.html` directly in any browser — no server, build step, or dependencies required.

## Features

- **Star rating widget** — hover preview, click-to-select, keyboard navigation (arrow keys), spring animation on selection
- **Live review feed** — new reviews appear instantly with a slide-in animation, no page reload
- **Persistent storage** — reviews survive page refreshes via `localStorage`
- **Real-time stats** — average rating, total count, 5-star percentage, and this-month counter update immediately on submission
- **Rating breakdown bars** — animated fill bars show distribution; click any bar to filter the feed
- **Filter & sort** — filter by star rating (All / 5★ / 4★ / 3★ / 2★ / 1★), sort by newest, oldest, highest, or lowest rated
- **Form validation** — inline field-level errors clear as soon as conditions are met
- **Character counter** — turns amber at 320/400 chars, red at 380/400
- **Toast notifications** — success toast confirms submission with the reviewer's name and rating
- **Accessible** — ARIA roles, live regions, keyboard navigation, screen-reader labels throughout
- **Responsive** — two-column on desktop (≥ 900 px), single-column on mobile
- **Dark gym theme** — matches the Gym Master design system (electric lime accent, surface greys)

## Usage

```
open feedback-form/index.html
```

Or drop it on any static host (GitHub Pages, Vercel, Netlify, S3).

## Integration with the Gym Master API

To wire the form to the live backend instead of `localStorage`:

1. Replace `loadReviews()` with a `GET /api/v1/feedback` fetch call.
2. Replace `saveReviews()` with a `POST /api/v1/feedback` fetch call.
3. For real-time multi-user updates, open a `GET /api/v1/feedback/stream` SSE connection and call `renderReviewsList()` on each `message` event.

## File structure

```
feedback-form/
└── index.html   ← entire app (HTML + CSS + JS, ~600 lines)
```

## Animations reference

| Animation      | Trigger                        | Easing                              |
|----------------|--------------------------------|-------------------------------------|
| `slideInRight` | New review enters the feed     | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `slideInUp`    | Field error / toast appears    | `ease`                              |
| `starPop`      | Star clicked                   | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `checkDraw`    | Success checkmark SVG path     | `ease` (delayed 0.2 s)              |
| `barGrow`      | Rating bars on initial render  | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `livePulse`    | Live indicator dot             | `ease-in-out` (infinite, 2 s)       |
| `statFlash`    | Stat card value updates        | accent → primary color, 0.8 s       |
| `pageFade`     | Page initial load              | `ease`, 0.5 s                       |
| `toastIn/Out`  | Toast notification             | spring in / ease out                |
