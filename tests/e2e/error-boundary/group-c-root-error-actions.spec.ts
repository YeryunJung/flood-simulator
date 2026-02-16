import { test, expect } from './fixtures';

test.describe('L1 루트 에러 — 새로고침 동작', () => {
  test('새로고침 버튼 클릭 시 페이지가 리로드된다', async ({ page }) => {
    await page.goto('/?__dev_rootError');

    const errorContainer = page.getByTestId('error-root-container');
    await expect(errorContainer).toBeVisible();

    // 새로고침 클릭 → 페이지 리로드 대기
    const refreshBtn = page.getByTestId('error-root-refresh-btn');
    await Promise.all([
      page.waitForEvent('load'),
      refreshBtn.click(),
    ]);

    // 쿼리 파라미터가 남아있으므로 리로드 후에도 에러 재표시
    await expect(errorContainer).toBeVisible();
  });
});
