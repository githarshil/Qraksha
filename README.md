# QRaksha

Visual decisions live in DESIGN.md. Do not override them here.

> Merchant self-audit tool that detects when a physical UPI QR sticker has been swapped, cloned, or relocated — backed by a five-agent AI verification pipeline and a public blockchain anchor for tamper-evident record-keeping.

## Documentation

- [AGENTS.md](AGENTS.md) — Coding rules, workflow constraints, and definition of done
- [PRD.md](PRD.md) — Product requirements document, user personas, UX states, and acceptance criteria
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical stack, data model, API design, security, and infrastructure
- [DESIGN.md](DESIGN.md) — Visual design system, color tokens, typography, layout rhythm, and component specifications
- [TASKS.md](TASKS.md) — Phased task breakdown and completion tracking

## Workspaces

- `apps/web` — Next.js PWA for merchants, customer checks, and admin console
- `apps/api` — Express.js REST API, agent orchestrator, and blockchain service
- `packages/shared` — Shared Zod schemas and TypeScript types

## Quick Start

```bash
# Install dependencies
npm install

# Run typecheck across all workspaces
npm run typecheck

# Run linter
npm run lint

# Run unit tests
npm run test

# Run frontend development server
npm run dev:web

# Run backend API development server
npm run dev:api
```

## NFC Tap-Verification Flow

QRaksha supports instant physical verification when a customer or auditor taps their smartphone against an NFC tag embedded in the merchant's UPI stand.

### 1. Exact URLs to Write to NFC Tags

Program physical NTAG213 / NTAG215 / NTAG216 tags with the standard NDEF URI record:

| Physical Tag         | Target URL                        | Expected Verdict (Zone A) | Merchant Identity         |
| :------------------- | :-------------------------------- | :------------------------ | :------------------------ |
| **Registered Tag**   | `https://<your-domain>/t/reg`     | 🟢 `VERIFIED`             | Sharma Tea Stall (Zone A) |
| **Unregistered Tag** | `https://<your-domain>/t/unreg`   | 🟡 `UNVERIFIED`           | Unregistered / Unknown    |
| **Any Other Tag**    | `https://<your-domain>/t/<anyId>` | 🟡 `UNVERIFIED`           | Unregistered / Unknown    |

### 2. Switching the Demo Location (Simulated Indoor GPS)

Indoor GPS signals are unreliable inside merchant stalls, so location evaluation uses simulated zones (`Zone A`, `Zone B`, `Zone C`). Location is determined in order:

1. **URL Query Parameter:** Append `?loc=<zone>` to the URL (e.g. `https://<your-domain>/t/reg?loc=zone-b`).
2. **Local Storage:** The value saved in `localStorage.getItem("qraksha_demo_location")`.
3. **Interactive UI Dropdown:** Tap the unobtrusive **"Demo controls"** dropdown button in the top-right corner to toggle between `Zone A`, `Zone B`, and `Zone C` live:
   - When set to `Zone A`: `/t/reg` evaluates to **🟢 VERIFIED** ("Credential matches this physical location").
   - When set to `Zone B` or `Zone C`: `/t/reg` immediately re-evaluates to **🔴 WARNING** ("This tag is registered to Sharma Tea Stall at Zone A, but it is being used at Zone B. Possible relocated or cloned tag. Do not pay.").

### 3. Audio Files & Voice Announcements

Audio files are statically served from `/audio/{verdict}_{lang}.mp3` (under `apps/web/public/audio/`).

- Supported verdicts: `verified`, `unverified`, `warning`
- Supported languages: `en` (English), `hi` (Hindi), `kn` (Kannada)
- Filename examples:
  - `apps/web/public/audio/verified_en.mp3`
  - `apps/web/public/audio/warning_hi.mp3`
  - `apps/web/public/audio/unverified_kn.mp3`

To replace or add audio files, place `.mp3` files in `apps/web/public/audio/` matching `{verdict}_{lang}.mp3`. If an MP3 is missing or autoplay is blocked on cold NFC tap, playback automatically falls back to browser `window.speechSynthesis` in `en-IN`, `hi-IN`, or `kn-IN`.
