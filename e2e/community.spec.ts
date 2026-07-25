import { test, expect, Page } from '@playwright/test';

const UNJOINED_COMMUNITY_PATH = '/cortis';
// 가입 자체를 완료시키는 테스트라 재실행 시 이미 가입된 상태가 될 수 있어 후보군 중 미가입 아티스트를 매번 선택한다
const UNJOINED_ARTIST_CANDIDATES = [
  'SHINee', 'Hearts2Hearts', 'CRAVITY', 'WEi', 'STAYC',
  'Destino', 'BamBam', 'KIM SEJEONG', 'Crystal Kay', 'TUIDE', 'SUNMI', 'BINI', 'KATSEYE',
];
const UNJOINED_ARTIST_WITH_MERCH_CANDIDATES = [
  'WayV', 'Red Velvet', 'SUPER JUNIOR', 'LE SSERAFIM', 'NCT DREAM',
  'TWICE', 'ATEEZ', 'ZEROBASEONE', 'TWS',
];
// 좋아요 카운트가 10K+로 절삭되지 않고, Artist 탭 피드가 만료된 Moments가 아닌 일반 게시글인 아티스트
const SMALL_COUNT_ARTIST_NAME = '8TURN';
const SMALL_COUNT_ARTIST_PATH = '/8turn';

//세션 전체 허용
async function acceptCookiesIfPresent(page: Page) {
  const acceptAll = page.getByRole('button', { name: 'Accept All' });
  if (await acceptAll.isVisible().catch(() => false)) {
    await acceptAll.click();
  }
}

async function openSearchCommunities(page: Page) {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(500);
  const searchText = page.getByText('Search Communities').first();
  await searchText.locator('xpath=ancestor::button[1]').click({ force: true });
}

// 검색 패널을 통해 커뮤니티 가입 (이미 가입된 상태면 아무 동작도 하지 않음)
async function joinCommunityViaSearch(page: Page, artistName: string) {
  await openSearchCommunities(page);
  const searchInput = page.locator('input[placeholder="Enter artist name"]');
  await searchInput.fill(artistName);

  const resultList = page.locator('ul.global-search-community-list-view-_-container');
  const resultItem = resultList.locator('li', { hasText: artistName });
  const joinBtn = resultItem.getByRole('button', { name: 'Join', exact: true });

  if (await joinBtn.isVisible().catch(() => false)) {
    await joinBtn.click();
    await expect(joinBtn).not.toBeVisible();
  }
  await page.keyboard.press('Escape');
}

// 후보 목록을 순서대로 검색해 아직 미가입인 첫 아티스트를 가입시키고 이름을 반환한다
async function joinFirstUnjoinedArtist(page: Page, candidateNames: string[]) {
  await openSearchCommunities(page);
  const searchInput = page.locator('input[placeholder="Enter artist name"]');
  const resultList = page.locator('ul.global-search-community-list-view-_-container');

  for (const name of candidateNames) {
    await searchInput.fill(name);
    const resultItem = resultList.locator('li', { hasText: name });
    await resultItem.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    const joinBtn = resultItem.getByRole('button', { name: 'Join', exact: true });
    if (await joinBtn.isVisible().catch(() => false)) {
      await joinBtn.click();
      await expect(joinBtn).not.toBeVisible();
      await page.keyboard.press('Escape');
      return name;
    }
    await searchInput.clear();
  }
  throw new Error('후보 아티스트가 모두 이미 가입되어 있습니다.');
}

function getFirstPostLikeButton(page: Page) {
  return page.locator('.toolbar-_-container').first().locator('button').first();
}

async function getLikeCount(likeButton: import('@playwright/test').Locator) {
  const text = await likeButton.innerText();
  return parseInt(text.replace(/\D/g, ''), 10);
}

test.describe('아티스트 커뮤니티', () => {
  // 실제 계정 상태(커뮤니티 가입 등)를 공유하는 테스트들이라 병렬 실행 시 서로의 "최근 가입" 순서를 뺏는
  // 경쟁 상태가 발생한다 (예: 사이드바/Merch 위젯이 최근 가입한 소수만 노출). 순차 실행으로 강제한다.
  test.describe.configure({ mode: 'serial' });

  test.describe('[COMMUNITY-001] 아티스트 커뮤니티 추가 후 상단 로고 노출 확인', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });
    test.skip(!!process.env.CI, 'CI 환경에서는 user.json이 없어 실행 불가');

    test('미추가 아티스트 커뮤니티 가입 시 좌측 나의 커뮤니티와 메인 상단에 로고가 노출된다', async ({ page }) => {
      // 사전 조건: 로그인 상태로 메인 접속, 미추가 아티스트 대상
      await page.goto('https://weverse.io');
      await acceptCookiesIfPresent(page);

      // 좌측 커뮤니티 찾기 클릭 → 미추가된 그룹 커뮤니티 가입 버튼 클릭
      const joinedArtist = await joinFirstUnjoinedArtist(page, UNJOINED_ARTIST_CANDIDATES);

      // 메인 화면 상단 확인: 좌측 나의 커뮤니티 목록
      await expect(page.getByRole('link', { name: joinedArtist, exact: true })).toBeVisible();

      // 메인 화면 상단 확인: 메인페이지 상단 아티스트 로고 줄
      await page.goto('https://weverse.io');
      await expect(page.getByText(joinedArtist, { exact: true }).first()).toBeVisible();
    });
  });

  test.describe('[COMMUNITY-002] 아티스트 추가 후 Merch 화면 실시간 미반영 확인', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });
    test.skip(!!process.env.CI, 'CI 환경에서는 user.json이 없어 실행 불가');

    test('커뮤니티 가입 직후에는 Merch 탭에 반영되지 않고, 새로고침 후 반영된다', async ({ page }) => {
      // 사전 조건: 로그인 상태로 메인 접속, 미추가 아티스트 대상
      await page.goto('https://weverse.io');
      await acceptCookiesIfPresent(page);

      const merchTabs = page.locator('.merch-module-tab-v2-_-container [role="tab"]');

      // 좌측 커뮤니티 찾기 클릭 → 미추가된 그룹 커뮤니티 가입 (홈 화면을 벗어나지 않고 팝업으로 처리)
      const joinedArtist = await joinFirstUnjoinedArtist(page, UNJOINED_ARTIST_WITH_MERCH_CANDIDATES);

      // 새로고침 전: Merch 컴포넌트에 가입한 아티스트의 굿즈 탭이 미노출
      await expect(merchTabs.filter({ hasText: joinedArtist })).toHaveCount(0);

      // 새로고침 후: Merch 컴포넌트에 가입한 아티스트의 굿즈 탭이 노출
      await page.reload();
      await expect(merchTabs.filter({ hasText: joinedArtist })).toHaveCount(1);
    });
  });

  test.describe('[COMMUNITY-003] 추가한 아티스트 게시글 좋아요 상태 확인', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });
    test.skip(!!process.env.CI, 'CI 환경에서는 user.json이 없어 실행 불가');

    test('아티스트 피드 게시글 좋아요 클릭 시 하트가 빨간색으로 변하고 카운트가 증가한다', async ({ page }) => {
      // 사전 조건: 아티스트 커뮤니티 가입 상태
      await page.goto('https://weverse.io');
      await acceptCookiesIfPresent(page);
      await joinCommunityViaSearch(page, SMALL_COUNT_ARTIST_NAME);

      // 가입 직후 서버 반영 지연 대비
      await page.waitForTimeout(1000);

      // 아티스트 커뮤니티 접속 → 상단 Artist 탭 클릭
      await page.goto(`https://weverse.io${SMALL_COUNT_ARTIST_PATH}`);
      const artistTab = page.getByRole('tab', { name: 'Artist', exact: true });
      await artistTab.click();
      await page.waitForURL(`**${SMALL_COUNT_ARTIST_PATH}/artist`);

      const likeButton = getFirstPostLikeButton(page);
      const heartPath = likeButton.locator('svg path').first();

      // 이전 실행에서 이미 좋아요 상태였다면 초기화
      if ((await heartPath.getAttribute('fill')) !== 'currentColor') {
        await likeButton.click();
        await expect(heartPath).toHaveAttribute('fill', 'currentColor');
      }
      const countBefore = await getLikeCount(likeButton);

      // 아티스트 피드 게시글의 좋아요 버튼 클릭 (가입 직후 반영 지연 대비 재시도)
      await expect(async () => {
        await likeButton.click();
        await expect(heartPath).toHaveAttribute('fill', '#FE5B58', { timeout: 1000 });
      }).toPass();

      // 좋아요 상태 확인: 좋아요 카운트 증가
      await expect(async () => {
        expect(await getLikeCount(likeButton)).toBe(countBefore + 1);
      }).toPass();
    });
  });

  // test.describe('[COMMUNITY-004] 추가한 아티스트 게시글 좋아요 반복적 상태 변경 시 접근 제한 상태 확인', () => {
  //   // 실사용에서 실제로 재현된 메시지: "잠시 권한이 제한됩니다. 잠시 후 다시 시도해주세요."
  //   // (화면 하단 토스트, ko-KR 로케일에서 CORTIS Artist 탭의 한 게시글에 좋아요를 4회 눌렀을 때 노출)
  //   // 이후 동일 조건(ko-KR locale, 같은/다른 게시글, 4~20회 클릭, API 응답 지연 등)으로 여러 번 재시도했으나
  //   // 자동화 환경에서는 재현하지 못함 - 계정의 최근 좋아요 누적 횟수(rolling window)에 따라 조건이 달라지는 것으로 추정
  //   // 재현 조건이 확정되면 이 테스트를 활성화할 것
  //   test.skip(true, '접근 제한 메시지는 실사용에서 확인했으나 자동화로 결정론적 재현 조건을 찾지 못해 스킵 처리');

  //   test('아티스트 피드 게시글 좋아요 버튼을 반복 클릭하면 접근 제한 메시지가 노출된다', async ({ page }) => {
  //     // 사전 조건: 아티스트 커뮤니티 가입 상태
  //     await page.goto('https://weverse.io');
  //     await acceptCookiesIfPresent(page);
  //     await joinCommunityViaSearch(page, SMALL_COUNT_ARTIST_NAME);

  //     // 아티스트 커뮤니티 접속 → 상단 Artist 탭 클릭
  //     await page.goto(`https://weverse.io${SMALL_COUNT_ARTIST_PATH}`);
  //     const artistTab = page.getByRole('tab', { name: 'Artist', exact: true });
  //     await artistTab.click();
  //     await page.waitForURL(`**${SMALL_COUNT_ARTIST_PATH}/artist`);

  //     const likeButton = getFirstPostLikeButton(page);

  //     // 좋아요 버튼을 연속으로 반복 클릭
  //     for (let i = 0; i < 20; i++) {
  //       await likeButton.click();
  //     }

  //     // 접근 제한 안내 메시지 확인
  //     await expect(page.getByText('잠시 권한이 제한됩니다. 잠시 후 다시 시도해주세요.')).toBeVisible();
  //   });
  // });

  test.describe('[COMMUNITY-005] 미추가한 아티스트 게시글 좋아요 클릭 시 커뮤니티 가입 팝업 노출', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });
    test.skip(!!process.env.CI, 'CI 환경에서는 user.json이 없어 실행 불가');

    test('미가입 아티스트 피드 게시글의 좋아요 버튼 클릭 시 커뮤니티 가입 팝업이 노출된다', async ({ page }) => {
      // 사전 조건: 미가입 아티스트 게시글 접근
      await page.goto(`https://weverse.io${UNJOINED_COMMUNITY_PATH}`);
      await acceptCookiesIfPresent(page);

      // 상단 Artist 탭 클릭
      const artistTab = page.getByRole('tab', { name: 'Artist', exact: true });
      await artistTab.click();
      await page.waitForURL(`**${UNJOINED_COMMUNITY_PATH}/artist`);

      // 아티스트 피드 게시글의 좋아요 버튼 클릭
      const likeButton = getFirstPostLikeButton(page);
      await likeButton.click();

      // 커뮤니티 가입하기 팝업창 노출 확인
      await expect(page.getByText('Join Community', { exact: true })).toBeVisible();
      await expect(page.getByText('Join a community to write posts, get notifications, and more!')).toBeVisible();
    });
  });

  test.describe('[COMMUNITY-007] 비로그인 상태에서 좋아요 클릭 시 로그인 유도 확인', () => {
    test('미가입 아티스트 커뮤니티의 Artist 탭은 비로그인 상태에서 피드 조회가 불가능하고 로그인 페이지로 유도한다', async ({ page }) => {
      // 사전 조건: 비로그인 상태로 미가입 아티스트 커뮤니티 접속
      await page.goto(`https://weverse.io${UNJOINED_COMMUNITY_PATH}`);
      await acceptCookiesIfPresent(page);

      // 상단 Artist 탭 클릭
      const artistTab = page.getByRole('tab', { name: 'Artist', exact: true });
      await artistTab.click();
      await page.waitForURL(`**${UNJOINED_COMMUNITY_PATH}/artist`);

      // 피드 조회 불가 확인
      await expect(page.getByText('Only for community members.')).toBeVisible();

      // 로그인 후 계속 버튼 확인
      const loginContinueButton = page.getByRole('button', { name: 'Log in to continue' });
      await expect(loginContinueButton).toBeVisible();

      // 버튼 클릭 시 로그인 페이지로 이동
      await loginContinueButton.click();
      await page.waitForURL('**/account.weverse.io/**/login**');
      expect(page.url()).toContain('account.weverse.io');
      expect(page.url()).toContain('/login');
    });
  });
});
