/**
 * Assert API responses during UI actions for acceptance (not toast-only).
 */
import { expect } from '@playwright/test';

/**
 * Click then wait for a matching API response; assert HTTP ok (or status).
 * @param {import('@playwright/test').Page} page
 * @param {() => Promise<void>} clickFn
 * @param {string|RegExp} urlPart
 * @param {{ method?: string, status?: number|number[], timeout?: number }} [opts]
 */
export async function clickAndExpectApi(page, clickFn, urlPart, opts = {}) {
  const method = (opts.method || 'POST').toUpperCase();
  const timeout = opts.timeout ?? 45_000;
  const respPromise = page.waitForResponse(
    (r) => {
      const u = r.url();
      const match =
        typeof urlPart === 'string' ? u.includes(urlPart) : urlPart.test(u);
      return match && r.request().method() === method;
    },
    { timeout }
  );
  await clickFn();
  const res = await respPromise;
  const allowed = opts.status
    ? Array.isArray(opts.status)
      ? opts.status
      : [opts.status]
    : null;
  if (allowed) {
    expect(allowed, `${method} ${urlPart}`).toContain(res.status());
  } else {
    expect(res.ok(), `${method} ${urlPart} → ${res.status()}`).toBeTruthy();
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status(), body, res };
}

/**
 * Wait for GET (or any method) without clicking.
 */
export async function expectApi(page, urlPart, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const timeout = opts.timeout ?? 30_000;
  const res = await page.waitForResponse(
    (r) => {
      const u = r.url();
      const match =
        typeof urlPart === 'string' ? u.includes(urlPart) : urlPart.test(u);
      return match && r.request().method() === method;
    },
    { timeout }
  );
  if (opts.status != null) {
    const allowed = Array.isArray(opts.status) ? opts.status : [opts.status];
    expect(allowed).toContain(res.status());
  } else {
    expect(res.ok(), `${method} ${urlPart} → ${res.status()}`).toBeTruthy();
  }
  return res;
}
