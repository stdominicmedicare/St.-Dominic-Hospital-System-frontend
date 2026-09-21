# PWA Checklist (Official Documentation)

This checklist is based on [web.dev](https://web.dev) and [Chrome PWA](https://developer.chrome.com/docs/lighthouse/pwa) documentation so the app behaves like a native app when **installed** or **added to home screen**.

---

## 1. Icons (why no icon showed before)

| Use case | What’s required | Where it’s used |
|----------|------------------|-----------------|
| **Chrome install / Android home screen** | PNG **192×192** and **512×512** in manifest | [web.dev install criteria](https://web.dev/articles/install-criteria) |
| **iOS “Add to Home Screen”** | **apple-touch-icon** 180×180 (or 192×192) in `<head>` | [web.dev Apple touch icon](https://web.dev/articles/codelab-apple-touch-icon), [Lighthouse](https://developer.chrome.com/docs/lighthouse/pwa/apple-touch-icon) |
| **Browser tab / favicon** | `favicon-96x96.png` or `favicon.svg` | General favicon |

**What was fixed**

- **Before:** No `apple-touch-icon.png` in `public/` → iOS used a screenshot or default, so “Add to Home Screen” had no proper icon.
- **Now:** `npm run generate-pwa-icons` creates:
  - `public/icons/icon-192.png`, `icon-512.png` (manifest)
  - `public/apple-touch-icon.png` (180×180) for iOS
  - `public/favicon-96x96.png` for favicon

---

## 2. Web app manifest

- **File:** `public/manifest.webmanifest` (and Vite PWA plugin output).
- **Must have:** `name` or `short_name`, `start_url`, `display` (`standalone`), **icons** (192 + 512 PNG).
- **Refs:** [web.dev add manifest](https://web.dev/articles/add-manifest), [web.dev install criteria](https://web.dev/articles/install-criteria).

---

## 3. HTML `<head>` (index.html)

- `link rel="manifest" href="/manifest.webmanifest"`
- `link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"`
- `meta name="apple-mobile-web-app-title" content="St. Dominic"`
- `meta name="theme-color" content="..."`
- Favicon links (e.g. `/favicon-96x96.png`, `/favicon.svg`).

---

## 4. Service worker

- Registered in `main.jsx` via `virtual:pwa-register` (Vite PWA).
- Required for install prompt and offline behavior ([web.dev](https://web.dev/learn/pwa/installation)).

---

## 5. How to test “like an app” / Add to Home Screen

1. **HTTPS** – Use HTTPS (e.g. ngrok or production). HTTP often blocks install / home screen.
2. **Chrome (desktop):** Install via address bar icon or menu → “Install St. Dominic Care”. App opens in its own window; icon in taskbar/dock.
3. **Chrome (Android):** Menu → “Add to Home screen” or “Install app”. Icon and name come from manifest + apple-touch-icon.
4. **iOS Safari:** Share → “Add to Home Screen”. Icon comes from **apple-touch-icon** (180×180 in `public/`).

After generating icons and deploying over HTTPS, you should see the St. Dominic Care icon and app-like window when installed or added to home screen.
