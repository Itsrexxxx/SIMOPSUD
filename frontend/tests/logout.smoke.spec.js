import { test, expect } from '@playwright/test';

// logout harus langsung memutus sesi: token & user dibersihkan, mendarat di /login, dan tidak balik sendiri
const session = { id: 1, username: 'smoke', full_name: 'Reykel Raflen', role: 'Admin', permissions: ['dashboard', 'aircraft', 'airbase', 'missions', 'users'], is_approved: true };

for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`logout memutus sesi (${vp.width}px)`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.setViewportSize(vp);
    await page.route('**/api/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0, alerts: [] }) }));
    await page.route('**/api/v1/auth/login', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 't', user: session }) }));

    await page.goto('/login');
    await page.getByLabel('Username atau NRP').fill('smoke');
    await page.getByLabel('Password').fill('SmokePassword123!');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await page.locator('.sidebar').waitFor();

    await page.locator('.user-trigger').click();
    await page.getByRole('menuitem', { name: 'Keluar' }).click();

    await page.waitForURL('**/login');
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('user'))).toBeNull();

    await page.waitForTimeout(1200);
    expect(page.url()).toContain('/login');
    await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
