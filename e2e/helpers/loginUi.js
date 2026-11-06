/**
 * Real UI login/logout for authority-facing acceptance.
 */
import { expect } from '@playwright/test';

export async function loginAs(page, email, password) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /MEMON COMMUNITY HOSPITAL/i })).toBeVisible({
    timeout: 20_000,
  });

  const emailInput = page
    .getByLabel(/Email/i)
    .or(page.getByPlaceholder(/admin@hospital|email/i))
    .or(page.locator('input[type="email"]'))
    .first();
  const passInput = page
    .getByLabel(/Password/i)
    .or(page.locator('input[type="password"]'))
    .first();

  await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
  await emailInput.fill(email);
  await passInput.fill(password);
  await page.getByRole('button', { name: /^Sign In$/i }).click();

  for (let i = 0; i < 3; i++) {
    const profileFail = page.getByText(/Profile couldn't be loaded|couldn't load your profile/i);
    if (await profileFail.isVisible({ timeout: 2500 }).catch(() => false)) {
      await page.getByRole('button', { name: /^Retry$/i }).click();
      await page.waitForTimeout(1200);
    } else {
      break;
    }
  }

  if (/\/change-password/i.test(page.url())) {
    throw new Error(`User ${email} requires password change before acceptance can continue`);
  }

  await expect
    .poll(() => page.url(), { timeout: 45_000 })
    .not.toMatch(/\/login\/?$/);
}

export async function logout(page) {
  const signOutBtn = page.getByRole('button', { name: /Sign out/i });
  if (await signOutBtn.count()) {
    await signOutBtn.click().catch(() => {});
  }
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /MEMON COMMUNITY HOSPITAL/i })).toBeVisible({
    timeout: 15_000,
  });
}

/** After role login (often /admin), jump into St Dominic HMS shell. */
export async function gotoHms(page, path = '/hms') {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
}
