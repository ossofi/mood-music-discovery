import { expect, test } from '@playwright/test';

test('phone layout: bottom tab bar, no horizontal scroll', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('alice@example.com');
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'How are you feeling?' })).toBeVisible();
  await expect(page.locator('nav.tabbar')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.getByRole('link', { name: 'Feed' }).last().boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});
