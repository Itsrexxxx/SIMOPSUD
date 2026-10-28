import { test, expect } from '@playwright/test';

// Regresi zona waktu: API mengirim waktu UTC tanpa penanda zona (MySQL DATETIME).
// Tanpa helper parseUtc, `new Date("2026-10-28T03:00:00")` dibaca sebagai jam lokal
// sehingga jam misi tampil 7 jam lebih awal (03:00 padahal 10:00 WIB).
test.use({ timezoneId: 'Asia/Jakarta' });

test('jam ETD/ETA misi tampil dalam WIB, bukan UTC mentah', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ access_token: 'smoke-token', user: { id: 1, username: 'smoke', full_name: 'Smoke User', role: 'Analyst', permissions: ['missions'], is_approved: true } }),
  }));
  await page.route('**/api/v1/airbase/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'X-Total-Count': '2' },
    body: JSON.stringify([
      { id: 1, name: 'Lanud Asal', code: 'ASAL', latitude: -6.2, longitude: 106.8, is_active: 1, avtur_capacity_liters: 1000, avtur_stock_liters: 900, apron_capacity_aircraft: 10 },
      { id: 2, name: 'Lanud Tujuan', code: 'TJN', latitude: -7.2, longitude: 107.8, is_active: 1, avtur_capacity_liters: 1000, avtur_stock_liters: 900, apron_capacity_aircraft: 10 },
    ]),
  }));
  await page.route('**/api/v1/aircraft/units/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'X-Total-Count': '1' },
    body: JSON.stringify([
      { id: 11, tail_number: 'SMOKE-777', status: 'S', airbase_id: 1, aircraft_type_id: 1, aircraft_type: { id: 1, name: 'CN-295' }, accumulated_flight_hours: 120 },
    ]),
  }));
  await page.route('**/api/v1/flight-missions/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'X-Total-Count': '1' },
    body: JSON.stringify([{
      id: 99,
      aircraft_id: 11,
      tail_number: 'SMOKE-777',
      origin_base_id: 1,
      origin_base_name: 'Lanud Asal',
      destination_base_id: 2,
      destination_base_name: 'Lanud Tujuan',
      scheduled_departure: '2026-10-28T03:00:00',   // UTC
      predicted_arrival: '2026-10-28T05:30:00',      // UTC
      predicted_duration_minutes: 150,
      distance_km: 400,
      status: 'Scheduled',
    }]),
  }));

  await page.goto('/login');
  await page.getByLabel('Username atau NRP').fill('smoke');
  await page.getByLabel('Password').fill('SmokePassword123!');
  await page.getByRole('button', { name: 'Masuk' }).click();

  await page.goto('/misi-penerbangan');
  await page.getByRole('button', { name: /Prediksi & daftar misi/ }).click();

  // 03:00 UTC = 10:00 WIB, 05:30 UTC = 12:30 WIB
  await expect(page.getByRole('cell', { name: 'ETD 10:00 ETA 12:30' })).toBeVisible();
  await expect(page.getByText(/ETD 03:00/)).toHaveCount(0);
});