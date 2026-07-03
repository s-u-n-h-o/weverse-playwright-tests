import { test as setup } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const email = process.env.WEVERSE_EMAIL;
const password = process.env.WEVERSE_PASSWORD;
const authFile = 'playwright/.auth/user.json';

// 수동 1회 실행 전용: npx playwright test e2e/auth.setup.ts --headed
// 이메일 인증코드는 자동화할 수 없어 page.pause()에서 직접 입력 후 Resume 필요
setup('로그인 세션 저장', async ({ page }) => {
  setup.skip(!email || !password, 'WEVERSE_EMAIL / WEVERSE_PASSWORD 환경변수가 없습니다');

  await page.goto('https://weverse.io');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Continue with email' }).click();

  await page.locator('input[type="text"][placeholder="your@email.com"]').fill(email!);
  await page.locator('input[type="password"][placeholder="Password"]').fill(password!);

  const loginButton = page.locator('.AuthLoginCredentialWidgetUi_button_login__NdFlW');
  await loginButton.click();

  console.log('\n이메일로 전송된 인증코드를 Inspector 창에서 직접 입력한 뒤 Resume을 눌러주세요.\n');
  await page.pause();

  await page.waitForURL('https://weverse.io/', { timeout: 60000 });

  await page.context().storageState({ path: authFile });
});
