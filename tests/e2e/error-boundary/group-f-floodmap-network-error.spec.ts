import { test, expect, ERROR_VISIBLE_TIMEOUT } from './fixtures';

test.describe('L3 네트워크 에러 → 공용 오버레이', () => {
  // [P0] 4.1 — 📡 아이콘 + 재시도 버튼 (오버레이)
  test('네트워크 에러 시 공용 오버레이에 📡 아이콘과 재시도 버튼이 표시된다', async ({ page }) => {
    await page.goto('/?__dev_networkError');

    const overlay = page.getByTestId('api-error-overlay');
    await expect(overlay).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    await expect(page.getByTestId('api-error-overlay-icon')).toContainText('📡');
    await expect(page.getByTestId('api-error-overlay-message')).not.toBeEmpty();

    const retryBtn = page.getByTestId('api-error-overlay-retry-btn');
    await expect(retryBtn).toBeVisible();
    await expect(retryBtn).toContainText('다시 시도');
  });
});
