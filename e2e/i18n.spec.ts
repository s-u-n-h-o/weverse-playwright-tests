import { test, expect, Page } from '@playwright/test';

const SETTINGS_URL = 'https://weverse.io/setting/config';
const ARTIST_TAB_URL = 'https://weverse.io/8turn/artist';

async function acceptCookiesIfPresent(page: Page) {
  const acceptAll = page.getByRole('button', { name: 'Accept All' });
  if (await acceptAll.isVisible().catch(() => false)) {
    await acceptAll.click();
  }
}

// 언어 설정 페이지에서 Service Language / Translated Language 행을 찾아 옵션을 선택한다
async function setLanguage(page: Page, rowLabel: 'Service Language' | 'Translated Language', optionName: string) {
  if (!page.url().startsWith(SETTINGS_URL)) {
    await page.goto(SETTINGS_URL);
    await acceptCookiesIfPresent(page);
  }

  const row = page.locator('.setting-list-item-_-wrapper').filter({ hasText: rowLabel });
  const trigger = row.getByRole('button');
  await trigger.click();

  const option = row.getByRole('button', { name: optionName, exact: true });
  await option.click();
  await page.waitForTimeout(500);
}

test.describe('다국어 변경', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });
  test.skip(!!process.env.CI, 'CI 환경에서는 user.json이 없어 실행 불가');

  test('[I18N-001] 서비스 언어 영어로 변경 후 UI언어 전환 확인', async ({ page }) => {
    // 기본 한국어로 설정
    await setLanguage(page, 'Service Language', '한국어');
    await expect(page.getByText('서비스 언어', { exact: true })).toBeVisible();

    // 좌측 상단의 더보기 > 설정 클릭 → 언어설정 창에서 서비스 언어 영어로 변경
    const row = page.locator('.setting-list-item-_-wrapper').filter({ hasText: '서비스 언어' });
    await row.getByRole('button').click();
    await row.getByRole('button', { name: 'English', exact: true }).click();

    // 메뉴, 버튼 UI가 영어로 변경
    await expect(page.getByText('Service Language', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  });

  test('[I18N-002] 번역 언어 변경 후 아티스트 게시글 번역 적용 확인', async ({ page }) => {
    // 번역 언어 영어 외(한국어)로 설정
    await setLanguage(page, 'Translated Language', '한국어');

    // 좌측 상단의 더보기 > 설정 클릭 → 언어설정 창에서 번역 언어 영어로 변경
    await setLanguage(page, 'Translated Language', 'English');
    await expect(
      page.locator('.setting-list-item-_-wrapper').filter({ hasText: 'Translated Language' }).getByRole('button')
    ).toHaveText('English');

    // 아티스트 게시글 아래 번역하기 클릭
    await page.goto(ARTIST_TAB_URL);
    await acceptCookiesIfPresent(page);

    const translateButton = page.locator('.post-module-_-translate_button').first();
    await translateButton.click();

    await expect(page.getByText('See original', { exact: false }).first()).toBeVisible();
  });

  test('[I18N-003] 서비스 언어와 번역 언어 독립 동작 확인', async ({ page }) => {
    // 서비스 언어는 영어, 번역 언어는 일본어로 적용
    await setLanguage(page, 'Service Language', 'English');
    await setLanguage(page, 'Translated Language', '日本語');

    // 메뉴 UI 확인: 서비스 언어(영어)로 노출
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(
      page.locator('.setting-list-item-_-wrapper').filter({ hasText: 'Service Language' }).getByRole('button')
    ).toHaveText('English');

    // 아티스트 게시글에 번역하기 클릭
    await page.goto(ARTIST_TAB_URL);
    await acceptCookiesIfPresent(page);

    const translateButton = page.locator('.post-module-_-translate_button').first();
    await translateButton.click();

    // 게시글은 번역 언어(일본어)로 번역되어 확인, 메뉴 UI는 계속 영어 유지
    await expect(page.getByText('See original', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
  });
});
