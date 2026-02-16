import { test, expect, ERROR_VISIBLE_TIMEOUT } from './fixtures';

test.describe('L2 FloodMap 렌더 에러', () => {
  // [P0] 2.1 — 위젯 폴백 표시 + Stats 격리
  test('FloodMap 렌더 에러 시 위젯 폴백이 표시되고 Stats는 정상이다', async ({ page }) => {
    await page.goto('/?__dev_floodMapRenderError');

    await expect(page.getByTestId('app-container')).toBeVisible();

    const errorFallback = page.getByTestId('error-fallback-container');
    await expect(errorFallback).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    await expect(page.getByTestId('error-fallback-icon')).toContainText('⚠️');
    await expect(page.getByTestId('error-fallback-title')).toHaveText('문제가 발생했습니다');
    await expect(page.getByTestId('error-fallback-message')).toContainText('DEV_FLOODMAP_RENDER_ERROR');
    await expect(page.getByTestId('error-fallback-retry-btn')).toBeVisible();

    // Stats 패널 정상 (에러 격리)
    await expect(page.getByTestId('stats-panel-container')).toBeVisible();
  });

  // [P0] 2.2 — 재시도 → 에러 재발 → URL 변경 시 복구
  test('재시도 시 에러가 유지되고, 클린 URL로 이동하면 복구된다', async ({ page }) => {
    await page.goto('/?__dev_floodMapRenderError');

    const errorFallback = page.getByTestId('error-fallback-container');
    await expect(errorFallback).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    // 재시도 클릭 → 쿼리 파라미터 유지로 에러 재발
    await page.getByTestId('error-fallback-retry-btn').click();
    await expect(errorFallback).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(page.getByTestId('stats-panel-container')).toBeVisible();

    // 클린 URL 이동 → 복구
    await page.goto('/');
    await expect(page.getByTestId('app-container')).toBeVisible();
    await expect(errorFallback).not.toBeVisible();
  });
});
