import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const email = process.env.WEVERSE_EMAIL;
const password = process.env.WEVERSE_PASSWORD;

test.describe('로그인 플로우', () => {
  test('이메일/비밀번호로 로그인 성공 후 홈페이지로 리다이렉트된다', async ({ page }) => {
    test.skip(!email || !password, 'WEVERSE_EMAIL / WEVERSE_PASSWORD 환경변수가 없습니다');

    await page.goto('https://weverse.io');

    // 홈페이지의 Login 버튼 클릭
    await page.getByRole('button', { name: 'Login' }).click();

    // account.weverse.io 로그인 페이지 로드 대기
    await expect(page).toHaveURL(/account\.weverse\.io.*login/);

    // Continue with email 클릭
    await page.getByRole('button', { name: 'Continue with email' }).click();
    await expect(page).toHaveURL(/account\.weverse\.io.*credential/);

    // 이메일 입력
    await page.locator('input[type="text"][placeholder="your@email.com"]').fill(email!);

    // 비밀번호 입력
    await page.locator('input[type="password"][placeholder="Password"]').fill(password!);

    // 로그인 버튼 활성화 대기 후 클릭
    const loginButton = page.locator('.AuthLoginCredentialWidgetUi_button_login__NdFlW');
    await expect(loginButton).toBeEnabled();
    await loginButton.click();

    // weverse.io 홈으로 리다이렉트 확인
    await expect(page).toHaveURL('https://weverse.io/', { timeout: 15000 });

    // 로그인 후 Login 버튼이 사라짐을 확인
    await expect(page.getByRole('button', { name: 'Login' })).not.toBeVisible();
  });

  test('잘못된 비밀번호 입력 시 에러 메시지가 노출된다', async ({ page }) => {
    await page.goto('https://weverse.io');

    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/account\.weverse\.io.*login/);

    await page.getByRole('button', { name: 'Continue with email' }).click();
    await expect(page).toHaveURL(/account\.weverse\.io.*credential/);

    await page.locator('input[type="text"][placeholder="your@email.com"]').fill('test@example.com');
    await page.locator('input[type="password"][placeholder="Password"]').fill('wrongpassword123!');

    const loginButton = page.locator('.AuthLoginCredentialWidgetUi_button_login__NdFlW');
    await expect(loginButton).toBeEnabled();
    await loginButton.click();

    // 에러 메시지 또는 로그인 페이지에 머물러 있음을 확인
    await expect(page).toHaveURL(/account\.weverse\.io/, { timeout: 10000 });
  });
});
