/**
 * API client: base URL + Authorization from Supabase session.
 *
 * FIXED: Added support for AbortController signal to enable timeouts
 */
import { supabase } from './supabase';

const PRODUCTION_API = 'https://st-dominic-hospital-system-backend.vercel.app';

function resolveApiBase() {
  const configured = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  // A frontend origin here makes /api/* hit the SPA (HTML), which is not JSON.
  if (typeof window !== 'undefined' && configured === window.location.origin) {
    return PRODUCTION_API;
  }
  return configured;
}

const API_BASE = resolveApiBase();

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  if (API_BASE.includes('ngrok')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
  return headers;
}

// FIXED: Added options parameter to support signal (AbortController)
export async function apiGet(path, options = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const body = await res.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    throw new Error(
      `API returned HTML instead of JSON (${res.status}). Check VITE_API_BASE_URL — it must be the backend, not this site.`
    );
  }
  if (!res.ok) {
    throw new Error(data?.error || res.statusText);
  }
  return data;
}

export async function apiPost(path, body) {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || res.statusText);
    error.status = res.status;
    error.data = err;
    throw error;
  }
  return res.json();
}

export async function apiPatch(path, body) {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function apiDelete(path) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Download binary export (xlsx/pdf). Triggers browser save. */
export async function apiDownload(path, fallbackFilename = 'download') {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { filename };
}
