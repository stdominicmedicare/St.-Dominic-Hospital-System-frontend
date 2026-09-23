/**
 * MFA / 2FA reference copies — DISABLED per client request (commented out of the live app).
 *
 * To re-enable later:
 * 1. Move AdminSecurity.jsx back to src/pages/AdminSecurity.jsx
 * 2. Uncomment MFA route/import in src/App.jsx
 * 3. Restore Login / ProtectedRoute from the *.withMfa.jsx copies (or uncomment stubs)
 * 4. Uncomment Security (2FA) nav links in Header, Sidebar, Footer
 * 5. Uncomment Admin MFA (AAL2) gate in backend src/middleware/auth.js
 * 6. Re-enable TOTP in Supabase Dashboard → Authentication → Multi-Factor
 *
 * Live app currently uses email/password only (no authenticator challenge).
 */
