import { expect, test } from '@playwright/test';

test('register: NRP terkirim sebagai nip, password tidak cocok ditolak lokal', async ({ page }) => {
  let payload = null;
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 200, body: '{}' }));
  await page.route('**/api/v1/auth/register', (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 1 }) });
  });

  await page.goto('/register');
  await page.getByLabel('NRP').fill('523819');
  await page.getByLabel('Username').fill('reykel');
  await page.getByLabel('Nama lengkap').fill('Reykel Raflen');
  await page.getByLabel('Satuan kerja').fill('Lanud Halim Perdanakusuma');
  await page.getByLabel('Password', { exact: true }).fill('RahasiaSekali123!');
  await page.getByLabel('Ulangi password').fill('BedaSekali123!');
  await page.getByRole('button', { name: 'Daftar' }).click();

  await expect(page.getByRole('alert')).toHaveText('Kata sandi tidak cocok.');
  expect(payload).toBeNull();

  await page.getByLabel('Ulangi password').fill('RahasiaSekali123!');
  await page.getByRole('button', { name: 'Daftar' }).click();
  await page.waitForURL('**/login');
  expect(payload.nip).toBe('523819');
  expect(payload.email).toBeUndefined();
});
