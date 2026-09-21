# St. Dominic Care – Frontend (React PWA)

Role-based React PWA for St. Dominic Care.

## Tech Stack

- **React** (Vite)
- **PWA** (manifest.json, service-worker.js)
- **Supabase** (Auth JWT, optional direct client)
- **Backend API** (Node.js + Express)

## Roles & Dashboards

| Role           | Dashboard Path   | Purpose                          |
|----------------|------------------|----------------------------------|
| Admin          | `/dashboards/Admin`   | Users, roles, config, audit      |
| Patient        | `/dashboards/Patient` | Appointments, records, requests  |
| Doctor         | `/dashboards/Doctor`  | Patients, prescriptions, orders  |
| Ambulance      | `/dashboards/Ambulance` | Requests, trip status           |
| ICU            | `/dashboards/ICU`     | Bed assignment, availability     |
| Pharmacy       | `/dashboards/Pharmacy` | Inventory, dispensing          |
| Blood Bank     | `/dashboards/BloodBank` | Inventory, requests, issuance |

## Folder Structure

```
src/
├── auth/              # Auth context, login, JWT handling
├── components/
│   ├── common/        # Shared UI components
│   └── layout/        # Role-based layout, sidebar
├── dashboards/        # One folder per role
├── routes/            # Route definitions, protected routes
├── services/          # API client, auth service
├── utils/             # Helpers, constants, role checks
├── App.jsx
└── main.jsx
```

## Phase 1 – Auth & Admin

- **Login** at `/login`; role-based redirect to `/admin`, `/patient`, or `/doctor`.
- **Admin** dashboard: Home, User Management, Role Assignment (requires Supabase `profiles` table).
- **Supabase setup:** See [../docs/SUPABASE-SETUP.md](../docs/SUPABASE-SETUP.md) to create the `profiles` table and first Admin user.

## Environment Variables

1. Copy `env.example` to `.env`.
2. Set:
   - `VITE_SUPABASE_URL` – Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` – Supabase anon key
   - `VITE_API_BASE_URL` – Backend API base URL
     - Local backend: `http://localhost:5000/api`
     - **Backend via ngrok:** `https://your-subdomain.ngrok-free.dev/api` (frontend on localhost:5173 will call this; backend must have `FRONTEND_URL=http://localhost:5173` for CORS)

## Getting Started

```bash
npm install
npm run dev
```

Dev server uses **mkcert** for trusted HTTPS so the **native "Install app"** prompt works on both `https://localhost:5173` and `https://192.168.100.7:5173` (no "Not secure" / no fallback popup). **One-time setup:** install the mkcert CA so your browser trusts the cert – the first time you run `npm run dev`, the plugin may prompt; or run `mkcert -install` (requires [mkcert](https://github.com/FiloSottile/mkcert) installed on your machine).

Build for production:

```bash
npm run build
```

PWA assets: `public/manifest.webmanifest`, service worker (from plugin), `public/icons/`.

### PWA install prompt (official criteria)

Installability follows [web.dev install criteria](https://web.dev/articles/install-criteria) and [Chrome installable manifest](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest):

- **Manifest:** `name`/`short_name`, `start_url`, `display: standalone`, **icons 192px and 512px (PNG)**.
- **HTTPS** (ngrok provides this).
- **Service worker** registered via `virtual:pwa-register` in `main.jsx`.
- **User engagement:** Chrome may show the prompt after ~1 click and ~30s on the page; the in-app “Install St. Dominic Care” button uses `beforeinstallprompt` when available.

PNG icons (including **apple-touch-icon** for iOS “Add to Home Screen”) are generated with `npm run generate-pwa-icons` (runs on `npm run build`). See [docs/PWA-CHECKLIST.md](docs/PWA-CHECKLIST.md) for the official PWA checklist. Next.js vs Vite: [docs/NEXTJS-VS-VITE.md](docs/NEXTJS-VS-VITE.md).
