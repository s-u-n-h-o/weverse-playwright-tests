import { test, expect } from '@playwright/test';

// auth.setup.ts로 저장해둔 로그인 세션을 재사용 (매번 로그인 안 해도 됨)
test.use({ storageState: 'playwright/.auth/user.json' });
test.skip(!!process.env.CI, 'CI 환경에서는 user.json이 없어 실행 불가');

test.describe('로그인 상태 테스트 (저장된 세션 재사용)', () => {
  test('저장된 세션으로 접속하면 Login 버튼이 보이지 않는다', async ({ page }) => {
    await page.goto('https://weverse.io');
    await expect(page.getByRole('button', { name: 'Login' })).not.toBeVisible();
  });
});
