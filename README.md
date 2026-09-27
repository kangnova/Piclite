# 🔆 PicLite

> **Compress, resize & convert images and PDFs — 100% in the browser.**
> No uploads. No accounts. No servers touching your files.

[![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite 7](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🚀 Live Demo

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkangnova%2FPiclite&env=DATABASE_URL,ADMIN_PASSWORD,ADMIN_SECRET&project-name=piclite)

<!-- TODO(owner): after deploying, replace the line below with your real URL -->
**Try it here:** `https://piclite-<your-project>.vercel.app` — open it, drag a photo or PDF, done.

One-click deploy provisions everything; the only secrets you need are a free [Neon](https://neon.tech) Postgres URL and two admin credentials (see [Deployment](#-deployment)).

## 💡 Why PicLite

Most "free compressor" sites upload your files to their servers. **PicLite never does.**

- 🔒 **Zero-upload architecture** — decoding, resizing, and encoding happen entirely on-device via Canvas API + Web Workers. Sensitive documents (IDs, diplomas, contracts) never leave the browser.
- ⚡ **Non-blocking UI** — image processing runs in a dedicated Web Worker with `OffscreenCanvas`, so the interface stays at 60fps even with 10 MB files.
- 🪶 **Lightweight by design** — ~86 kB gzipped initial bundle; the 1 MB PDF engine loads lazily only when a PDF is actually dropped.

## ✨ Features

| | Feature | Details |
|---|---|---|
| 🗜️ | **Image compression** | Quality slider 10–100%, live before/after preview with real-time file-size estimates |
| 📐 | **Resize** | Width × height with aspect-ratio lock |
| 🔄 | **Format conversion** | JPG / PNG / WebP output |
| 📄 | **PDF compression** | Auto-detected; pages rasterized at 2× then rebuilt as optimized JPEG via pdf.js + pdf-lib, with per-page progress |
| 🖼️ | **Modern input formats** | HEIC/HEIF (iPhone photos) & AVIF decode via `createImageBitmap` |
| 🌐 | **Bilingual UI** | Indonesian 🇮🇩 / English 🇬🇧, persisted in localStorage |
| 📊 | **Admin dashboard** | Usage analytics (daily / weekly / monthly / yearly) with 30-day chart |
| 🧹 | **Data hygiene** | Selective stats deletion by date range & kind — test traffic never pollutes real metrics |
| 💰 | **Remote ad config** | Google AdSense managed from the admin panel — no redeploys, no code changes |
| 🔍 | **SEO-ready** | Meta/OG/JSON-LD, `sitemap.xml`, `robots.txt`, bilingual content, privacy & contact pages |

## 🏗️ Architecture

```
┌────────────────────── Browser (user's device) ──────────────────────┐
│  React 19 SPA                                                       │
│   ├── image.worker.ts   → decode (createImageBitmap)                │
│   │                       + OffscreenCanvas + encode  (no UI block) │
│   ├── pdf.ts (lazy)     → pdf.js render → pdf-lib rebuild           │
│   └── usage.ts          → anonymous counters (sendBeacon)           │
└──────────────┬──────────────────────────────┬───────────────────────┘
               │                              │
        /api/track                    /api/adsense-config
               ▼                              ▼
┌──────────── Neon Postgres (serverless) ─────────────────────────────┐
│  usage_daily  → aggregate counts only (no IPs, no files, no PII)    │
│  app_config   → AdSense + tracking toggles (edited via #admin)      │
└──────────────────────────────────────────────────────────────────────┘
```

**API surface** (Vercel Functions, TypeScript): `POST /api/track` · `GET /api/adsense-config` · `POST /api/admin/{login,logout,stats-reset,adsense,tracking}` · `GET /api/admin/stats` — with HMAC-signed HttpOnly session cookies, timing-safe password checks, and per-IP rate limiting.

## 🛠️ Tech Stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 19 + Tailwind CSS 4 | Modern, fast, zero-runtime CSS |
| Language | TypeScript (strict mode) | Full type safety across SPA *and* serverless functions |
| Build | Vite 7 | Instant HMR, native ESM |
| Image engine | Canvas API + Web Workers + OffscreenCanvas | Parallel, non-blocking processing |
| PDF engine | pdf.js + pdf-lib (lazy-loaded) | Industry-standard parsing & rebuilding |
| Database | Neon serverless Postgres | HTTP driver → perfect for serverless, generous free tier |
| Hosting | Vercel | Static SPA + serverless functions in one deploy |

## ⚙️ Getting Started

```bash
git clone https://github.com/kangnova/Piclite.git
cd Piclite
npm install

# configure environment
cp .env.example .env
# → fill DATABASE_URL (free at neon.tech), ADMIN_PASSWORD, ADMIN_SECRET

# create database tables
npm run setup-db

npm run dev        # http://localhost:5173
```

Admin dashboard: `http://localhost:5173/#admin` · Privacy page: `/privacy`

> Hits from `localhost` are never recorded — local testing keeps production stats clean.

## 📦 Deployment

1. Click the **Deploy with Vercel** button above (or import the repo at [vercel.com/new](https://vercel.com/new))
2. Set the three environment variables:

   | Variable | Purpose |
   |---|---|
   | `DATABASE_URL` | Neon Postgres connection string |
   | `ADMIN_PASSWORD` | Password for the `/#admin` dashboard |
   | `ADMIN_SECRET` | Random string for HMAC session signing |

3. Run `npm run setup-db` against your Neon instance (or paste `api/schema.sql` into the Neon SQL editor)
4. Done — stats and remote ad config are live

## 🔐 Privacy & Security Notes

- Files are processed **entirely client-side**; no upload endpoint exists
- Analytics are **aggregate counts only** — no IPs, no file names, no document contents, no fingerprints
- Admin sessions use HMAC-signed, HttpOnly, Secure cookies; passwords compared timing-safely
- Full disclosure in the [Privacy Policy](src/components/StaticPages.tsx) (bilingual), served at `/privacy`

## 🗺️ Roadmap

- [ ] Target-size compression ("shrink to < 200 KB") for form submissions
- [ ] Batch processing for multiple files
- [ ] PWA / offline support
- [ ] Custom date-range filters & CSV export in the admin dashboard

## 📄 License

[MIT](LICENSE) © 2026 Nova Suharyanto
