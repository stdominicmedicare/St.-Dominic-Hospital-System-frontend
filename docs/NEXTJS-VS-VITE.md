# Next.js vs Vite (React) – Recommendation for St. Dominic Care

## Your setup today

- **Frontend:** React (Vite) PWA, role-based dashboards, Supabase auth (planned).
- **Backend:** Node.js + Express, Supabase DB.
- **Need:** App-like experience (install, Add to Home Screen, icons), role-based UI, one backend.

---

## Option A: Stay with Vite + React (recommended for now)

**Pros**

- Already in place: PWA (manifest, service worker, icons), CORS, env, dashboards scaffold.
- Fits **dashboard-style apps** that are mostly behind login (no strong SEO need).
- Simple mental model: SPA + Express API; Supabase for auth/DB.
- PWA tooling (e.g. vite-plugin-pwa) is straightforward.
- Less migration risk and faster iteration.

**Cons**

- No built-in SSR/SSG (only matters if you need SEO or first-load from server).
- Routing and data fetching are your responsibility (e.g. React Router).

**When it’s a good fit**

- St. Dominic Care stays a **logged-in, role-based app** (Admin, Doctor, Patient, etc.).
- You don’t need public, SEO-heavy marketing pages or server-rendered landing pages.
- You want to ship and refine features quickly.

**Recommendation:** Fix and polish the current Vite PWA (icons, manifest, Add to Home Screen) and keep this stack unless you have a clear need for Next.js.

---

## Option B: Move to Next.js

**Pros**

- SSR/SSG for public or semi-public pages (e.g. marketing, public info).
- File-based routing and API routes (could replace or complement Express).
- Strong ecosystem and deployment (e.g. Vercel).

**Cons**

- **Migration cost:** Recreate routing, env, auth wiring, and PWA setup (e.g. next-pwa or custom).
- **Duplicate API layer:** You already have Express + Supabase; Next.js API routes would add a second API surface unless you fully replace Express.
- PWA (icons, manifest, “Add to Home Screen”) must be re-done and tested again.

**When it’s a good fit**

- You need **SEO** or **server-rendered** pages (e.g. public hospital info, blog, landing).
- You want to **consolidate** backend into Next.js API routes and eventually phase out Express.
- You’re early enough that a full rewrite is acceptable.

**Scenario if you choose Next.js**

1. New Next.js app (App Router or Pages Router).
2. Move UI components and role-based dashboards into Next.js pages/layouts.
3. Auth: keep Supabase; integrate with Next.js (middleware, server components or client).
4. Either:
   - Keep Express as the main API and call it from Next.js (client or server), or  
   - Reimplement API in Next.js API routes and call Supabase from there, then retire Express.
5. Re-add PWA: manifest (with 192 + 512 icons), apple-touch-icon, service worker (e.g. next-pwa), and test install / Add to Home Screen again.

---

## Direct recommendation

1. **Short term:** Stay on **Vite + React**. Use the [PWA checklist](./PWA-CHECKLIST.md) and the new icons (including `apple-touch-icon.png`) so that when users “install” or “Add to Home Screen,” they get the correct icon and app-like experience.
2. **Revisit Next.js** only if you later need:
   - Public, SEO-focused pages, or  
   - A single Next.js app that owns both UI and API and you’re willing to migrate Express and redo PWA.

Keeping Vite now lets you focus on making the current app feel like a real app (icons, install, home screen) without the cost of a full framework migration.
