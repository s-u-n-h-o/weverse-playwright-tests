import { test, expect, Page } from '@playwright/test';

const SELECTORS = {
  searchInput: 'input[placeholder="Enter artist name"]',
  resultList: 'ul.global-search-community-list-view-_-container',
  noResult: '.global-search-community-empty-result-view-_-container',
};

function getLocators(page: Page) {
  return {
    searchInput: page.locator(SELECTORS.searchInput),
    resultList: page.locator(SELECTORS.resultList),
    noResult: page.locator(SELECTORS.noResult),
  };
}

test.describe('검색 기능', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://weverse.io');

    // 사이드 메뉴 열기
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.waitForTimeout(500);

    // Search Communities 버튼 클릭 (force: 사이드바 expand 전에도 동작)
    const searchText = page.getByText('Search Communities');
    await searchText.locator('xpath=ancestor::button[1]').click({ force: true });
    await page.waitForTimeout(500);
  });

  test('검색 입력창이 노출된다', async ({ page }) => {
    const { searchInput } = getLocators(page);
    await expect(searchInput).toBeVisible();
  });

  test('[SEARCH-001] 그룹명 검색 시 결과가 노출된다', async ({ page }) => {
    const { searchInput, resultList } = getLocators(page);
    await searchInput.fill('PLAVE');

    await expect(resultList).toBeVisible();
    await expect(resultList.getByText('PLAVE')).toBeVisible();
  });

  test('[SEARCH-002] 아티스트 이름 검색 시 해당 결과가 노출된다', async ({ page }) => {
    const { searchInput, resultList } = getLocators(page);
    await searchInput.fill('신유');

    await expect(resultList).toBeVisible();
    await expect(resultList.getByText('TWS')).toBeVisible();
  });

  test('[SEARCH-003] 검색 페이지 진입 시 전체 아티스트 커뮤니티 리스트가 노출된다', async ({ page }) => {
    const { resultList } = getLocators(page);
    await expect(resultList).toBeVisible();
  });

  test('[SEARCH-004] 검색어 입력 후 지우면 결과가 사라진다', async ({ page }) => {
    const { searchInput, resultList } = getLocators(page);
    await searchInput.fill('BTS');

    await expect(resultList).toBeVisible();

    await searchInput.clear();

    await expect(resultList).not.toBeVisible();
  });

  test('[SEARCH-005] 한글 초성 검색 시 검색결과 없음이 노출된다', async ({ page }) => {
    const { searchInput, noResult } = getLocators(page);
    await searchInput.fill('ㅌㅇㅅ');

    await expect(noResult).toBeVisible();
    await expect(noResult).toHaveText('No search results found.');
  });
});
