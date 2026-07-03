import { test, expect } from '@playwright/test';

test.describe('홈페이지 주요 UI 요소', () => {
  // 위버스 홈페이지 접속
  test.beforeEach(async ({ page }) => {
    await page.goto('https://weverse.io');
  });

  test('Weverse 로고가 노출된다', async ({ page }) => {
    const logo = page.locator('a[href="https://weverse.io"]').first();
    await expect(logo).toBeVisible();
  });

  test('햄버거 메뉴 버튼이 노출된다', async ({ page }) => {
    const menuButton = page.getByRole('button', { name: 'Menu' });
    await expect(menuButton).toBeVisible();
  });

  test('로그인 버튼이 노출된다', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: 'Login' });
    await expect(loginButton).toBeVisible();
  });

  test('홈 배너가 노출된다', async ({ page }) => {
    const banner = page.locator('[class*="home-banner-list-item-view-_-container"]').first();
    await expect(banner).toBeVisible();
  });

  test('아티스트 하이라이트 링크가 노출된다', async ({ page }) => {
    // 상단 피처드 아티스트 링크 (예: /bts/highlight, /seventeen/highlight 등)
    const artistLinks = page.locator('a[href*="/highlight"]');
    await expect(artistLinks.first()).toBeVisible();
  });

  test('Shop 링크가 노출된다', async ({ page }) => {
    const shopLink = page.locator('a[href="https://weverseshop.io"]');
    await expect(shopLink).toBeVisible();
  });

  test('페이지 타이틀이 Weverse를 포함한다', async ({ page }) => {
    await expect(page).toHaveTitle(/Weverse/);
  });
});
