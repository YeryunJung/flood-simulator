import { test, expect, ERROR_VISIBLE_TIMEOUT } from './fixtures';

test.describe('L3 FloodMap API/맵 에러', () => {
  // [P1] 5.1 — API 403 → ⚠️ 아이콘, 재시도 버튼 없음
  test('API 403 에러 시 ⚠️ 아이콘이 표시되고 재시도 버튼은 없다', async ({ page }) => {
    await page.goto('/?__dev_apiError=403');

    const errorContainer = page.getByTestId('floodmap-error-container');
    await expect(errorContainer).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    await expect(page.getByTestId('floodmap-error-icon')).toContainText('⚠️');
    await expect(page.getByTestId('floodmap-error-retry-btn')).not.toBeVisible();
  });

  // [P2] 6.1 — 맵 초기화 에러 → ⚠️ 아이콘, 재시도 버튼 없음, Stats 정상
  test('맵 초기화 에러 시 에러 UI가 표시되고 Stats는 정상이다', async ({ page }) => {
    await page.goto('/?__dev_mapError');

    const errorContainer = page.getByTestId('floodmap-error-container');
    await expect(errorContainer).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    await expect(page.getByTestId('floodmap-error-icon')).toContainText('⚠️');
    await expect(page.getByTestId('floodmap-error-message')).toBeVisible();
    await expect(page.getByTestId('floodmap-error-retry-btn')).not.toBeVisible();

    // Stats 패널 정상 (에러 격리)
    await expect(page.getByTestId('stats-panel-container')).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
  });
});
