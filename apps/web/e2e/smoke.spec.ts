import { expect, test } from '@playwright/test';

/**
 * Backend-free smoke tests. These assert only on behaviour that holds without a
 * running API or Supabase: the app shell mounts, routing works, the not-found
 * page renders, and the sign-in form is present and validates client-side.
 */

test.describe('application shell', () => {
  test('home page boots and renders the app chrome', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Aegis Map/i);
    // The <main id="main-content"> landmark is always rendered by the layout.
    await expect(page.getByRole('main')).toBeVisible();
    // Accessibility: a skip-to-content link precedes the main content.
    await expect(page.getByRole('link', { name: /skip to main content/i })).toBeAttached();
  });

  test('unknown routes render the not-found page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to the map/i })).toBeVisible();
  });
});

test.describe('authentication', () => {
  test('the login page renders an accessible sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create an account/i })).toBeVisible();
  });

  test('submitting an empty form is blocked client-side', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Zod + react-hook-form reject the empty form before any network call, so
    // we stay on /login and the email field is flagged invalid for a11y.
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});
