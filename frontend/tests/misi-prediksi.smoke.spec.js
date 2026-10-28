import { test, expect } from '@playwright/test';

// Regresi: dulu Modal memasang effect fokus dengan dep [onClose]; tiap ketikan memicu render
// ulang parent -> arrow onClose baru -> effect jalan lagi -> fokus pindah ke tombol tutup,
// sehingga input hanya menerima satu huruf lalu "keluar".
test('form prediksi ETA menerima ketikan panjang dan fokus tidak tercuri', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await page.route('**/api/v1/auth/login', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ access_token: 'smoke-token', user: { id: 1, username: 'smoke', full_name: 'Smoke User', role: 'Analyst', permissions: ['missions'], is_approved: true } }),
  }));
  await page.route('**/api/v1/airbase/**', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'X-Total-Count': '2' },
    body: JSON.stringify([
      { id: 1, name: 'Lanud Asal', code: 'ASAL', latitude: -6.2, longitude: 106.8, is_active: 1, avtur_capacity_liters: 1000, avtur_stock_liters: 900, apron_capacity_aircraft: 10 },
      { id: 2, name: 'Lanud Tujuan', code: 'TJN', latitude: -7.2, longitude: 107.8, is_active: 1, avtur_capacity_liters: 1000, avtur_stock_liters: 900, apron_capacity_aircraft: 10 },
    ]),
  }));
  await page.route('**/api/v1/aircraft/units/**', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'X-Total-Count': '1' },
    body: JSON.stringify([
      { id: 11, tail_number: 'SMOKE-777', status: 'S', airbase_id: 1, aircraft_type_id: 1, aircraft_type: { id: 1, name: 'CN-295' }, accumulated_flight_hours: 120 },
    ]),
  }));
  await page.route('**/api/v1/flight-missions/**', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'X-Total-Count': '0' },
    body: JSON.stringify([]),
  }));

  await page.goto('/login');
  await page.getByLabel('Username atau NRP').fill('smoke');
  await page.getByLabel('Password').fill('SmokePassword123!');
  await page.getByRole('button', { name: 'Masuk' }).click();

  await page.goto('/misi-penerbangan');
  await page.getByRole('button', { name: /Prediksi & daftar misi/ }).click();

  // Pesawat serviceable (status turunan S) harus muncul di dropdown.
  await expect(page.getByRole('dialog').getByRole('combobox').first().locator('option', { hasText: 'SMOKE-777' })).toHaveCount(1);

  const payload = page.getByRole('dialog').getByRole('spinbutton').first();  // Payload (kg)
  await payload.click();
  await payload.pressSequentially('12345', { delay: 40 });
  await expect(payload).toHaveValue('12345');
  await expect(payload).toBeFocused();

  const fl = page.getByRole('dialog').getByRole('spinbutton').nth(1);  // Flight Level
  await fl.click();
  await fl.pressSequentially('280', { delay: 40 });
  await expect(fl).toHaveValue('280');
  await expect(fl).toBeFocused();

  expect(pageErrors).toEqual([]);
});