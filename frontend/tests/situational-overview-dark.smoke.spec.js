import { test, expect } from '@playwright/test';

// Mode gelap dulu menukar provider tile (CARTO dark) yang di sebagian jaringan tampak
// meminta API key / kosong. Sekarang satu provider OSM + filter CSS: tidak ada request
// ke host lain dan tile tetap tampil.
async function mockApi(page) {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ access_token: 'smoke-token', user: { id: 1, username: 'smoke', full_name: 'Smoke User', role: 'Analyst', permissions: ['dashboard'], is_approved: true } }),
  }));
  await page.route('**/api/v1/situational-overview/tracks**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      server_time: new Date().toISOString(),
      telemetry: { mode: 'virtual', label: 'Telemetry virtual' },
      airbases: [{ id: 1, name: 'Lanud Zero', code: 'ZERO', lat: 0, lon: 0, status: 'optimal', avtur_percent: 100, apron_used: 0, apron_capacity_aircraft: 4 }],
      tracks: [],
      adsb_tracks: [],
    }),
  }));
}

test('mode gelap: peta tetap satu provider OSM, tanpa host tile lain', async ({ page }) => {
  const tileHosts = new Set();
  page.on('request', (request) => {
    if (/\.png(\?|$)/.test(request.url())) tileHosts.add(new URL(request.url()).host);
  });
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem('simopsud-theme', 'dark'));
  await page.goto('/login');
  await page.getByLabel('Username atau NRP').fill('smoke');
  await page.getByLabel('Password').fill('SmokePassword123!');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.goto('/situational-overview');

  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
  await expect(map).toHaveClass(/map-dark/);
  await expect(page.locator('.leaflet-tile-pane')).toHaveCount(1);
  expect([...tileHosts].filter((host) => host.includes('cartocdn'))).toEqual([]);
});

test('legenda peta tembus pandang saat kursor tidak di atasnya', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await page.getByLabel('Username atau NRP').fill('smoke');
  await page.getByLabel('Password').fill('SmokePassword123!');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.goto('/situational-overview');

  const legend = page.locator('[aria-label="Legenda peta"]');
  await expect(legend).toBeVisible();
  await expect(legend).toHaveCSS('opacity', '0.4');
  await legend.hover();
  await expect(legend).toHaveCSS('opacity', '1');
});