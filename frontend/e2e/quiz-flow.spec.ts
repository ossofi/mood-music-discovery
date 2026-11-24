import { expect, test } from '@playwright/test';

test('sign in, take the quiz, get and rate a playlist', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('alice@example.com');
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'How are you feeling?' })).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Get my playlist' }).click();

  await expect(page.getByRole('heading', { name: 'Your playlist' })).toBeVisible();
  await page.getByRole('button', { name: '5 out of 5' }).click();
  await expect(page.getByText('You rated this playlist 5/5')).toBeVisible();

  await page.getByRole('link', { name: 'Playlists' }).first().click();
  await expect(page.getByRole('heading', { name: 'Your playlists' })).toBeVisible();
});

test('a wrong password shows an error and stays on the login page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('alice@example.com');
  await page.getByLabel('Password').fill('nope');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('E-mail or password is incorrect.')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('themes can be switched', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '60s–70s' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'era-60-70');
  await page.getByRole('button', { name: '80s–90s' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'era-80-90');
});
