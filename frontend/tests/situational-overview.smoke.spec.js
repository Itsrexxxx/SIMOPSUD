import { test, expect } from '@playwright/test';

test('login, open Situational Overview, render markers and survive polling', async ({ page }) => {
  let pollCount = 0;
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));  // layar putih = error render, harus gagal di sini
  await page.route('**/api/v1/auth/login', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ access_token: 'smoke-token', user: { id: 1, username: 'smoke', full_name: 'Smoke User', role: 'Analyst', permissions: ['dashboard'], is_approved: true } }),
  }));
  await page.route('**/api/v1/situational-overview/tracks**', async (route) => {
    pollCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        server_time: new Date().toISOString(),
        telemetry: { mode: 'virtual', label: 'Telemetry virtual — bukan GPS nyata' },
        airbases: [{ id: 1, name: 'Lanud Zero', code: 'ZERO', icao: 'WZZZ', lat: 0, lon: 0, status: 'optimal', avtur_percent: 100, apron_used: 0, apron_capacity_aircraft: 4 }],
        adsb_tracks: Array.from({ length: 12 }, (_, i) => ({
          icao24: `ac00${i}`, tail_number: `SMOKE-A${i}`, latitude: 0.5 + i / 100, longitude: 0.5 + i / 100,
          altitude_m: 9000, speed_kmh: 800, status: 'LIVE', heading_deg: 45, provider: 'adsb.lol', observed_at: new Date().toISOString(),
        })),
        tracks: [{ mission_id: 7, tail_number: 'SMOKE-001', status: 'In-Flight', origin: { id: 1, name: 'Lanud Zero', lat: 0, lon: 0 }, destination: { id: 2, name: 'Lanud Dest', lat: 1, lon: 1 }, position: { lat: 0.5, lon: 0.5 }, heading_deg: 45, progress_percent: 50, speed_kmh: 700, eta: null }],
      }),
    });
  });
  await page.goto('/login');
  await page.getByLabel('Username / NIP').fill('smoke');
  await page.getByLabel('Password').fill('SmokePassword123!');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.goto('/situational-overview');
  await expect(page.getByText('Situational Overview')).toBeVisible();
  await expect(page.getByRole('row', { name: /SMOKE-001.*Lanud Zero/ })).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  await expect(page.getByText(/13 baris · 1 misi · 12 ADSB · status filter: In-Flight/)).toBeVisible();
  await expect(page.getByText(/1–10 dari 13 baris · 1\/2 halaman/)).toBeVisible();
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(page.getByText(/11–13 dari 13 baris · 2\/2 halaman/)).toBeVisible();
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(map).toBeVisible();
  expect(pollCount).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});
