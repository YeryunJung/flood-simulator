import { test, expect, ERROR_VISIBLE_TIMEOUT } from './fixtures';

test.describe('복합 에러', () => {
  // [P2] 8.1 — FloodMap + Stats 동시 에러 → 양쪽 독립 표시 + 격리 재시도
  test('양쪽 위젯 에러가 독립적으로 표시되고 재시도도 격리된다', async ({ page }) => {
    await page.goto('/?__dev_floodMapRenderError&__dev_statsError');

    const errorFallback = page.getByTestId('error-fallback-container');
    const statsFallback = page.getByTestId('stats-fallback-container');
    await expect(errorFallback).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(statsFallback).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(page.getByTestId('app-container')).toBeVisible();

    // FloodMap 재시도 → Stats에 영향 없음
    await page.getByTestId('error-fallback-retry-btn').click();
    await expect(errorFallback).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(statsFallback).toBeVisible();

    // Stats 재시도 → FloodMap에 영향 없음
    await page.getByTestId('stats-fallback-retry-btn').click();
    await expect(statsFallback).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(errorFallback).toBeVisible();
  });

  // [P2] 8.2 — 루트 + FloodMap 동시 에러 → 루트 에러 우선
  test('루트 에러가 위젯 에러보다 우선 표시된다', async ({ page }) => {
    await page.goto('/?__dev_rootError&__dev_floodMapRenderError');

    // 루트 에러만 표시 (앱 자체가 안 그려짐)
    await expect(page.getByTestId('error-root-container')).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(page.getByTestId('error-fallback-container')).not.toBeVisible();
    await expect(page.getByTestId('app-container')).not.toBeVisible();
    await expect(page.getByTestId('floodmap-container')).not.toBeVisible();
  });
});
