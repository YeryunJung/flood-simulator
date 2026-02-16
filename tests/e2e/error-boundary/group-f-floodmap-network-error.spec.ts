import { test, expect, ERROR_VISIBLE_TIMEOUT } from './fixtures';

test.describe('L3 FloodMap 네트워크 에러', () => {
  // [P0] 4.1 — 📡 아이콘 + 재시도 버튼
  test('네트워크 에러 시 📡 아이콘과 재시도 버튼이 표시된다', async ({ page }) => {
    await page.goto('/?__dev_networkError');

    // React Query 재시도 완료 대기
    const errorContainer = page.getByTestId('floodmap-error-container');
    await expect(errorContainer).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    await expect(page.getByTestId('floodmap-error-icon')).toContainText('📡');
    await expect(page.getByTestId('floodmap-error-message')).not.toBeEmpty();

    const retryBtn = page.getByTestId('floodmap-error-retry-btn');
    await expect(retryBtn).toBeVisible();
    await expect(retryBtn).toContainText('다시 시도');
  });
});
