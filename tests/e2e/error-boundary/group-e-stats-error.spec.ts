import { test, expect, ERROR_VISIBLE_TIMEOUT } from './fixtures';

test.describe('L2 Stats 패널 에러', () => {
  // [P1] 3.1 — 커스텀 폴백 UI + FloodMap 격리
  test('Stats 에러 시 커스텀 폴백이 표시되고 FloodMap은 정상이다', async ({ page }) => {
    await page.goto('/?__dev_statsError');

    await expect(page.getByTestId('app-container')).toBeVisible();

    const statsFallback = page.getByTestId('stats-fallback-container');
    await expect(statsFallback).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    await expect(page.getByTestId('stats-fallback-message')).toContainText('데이터를 불러올 수 없습니다');
    await expect(page.getByTestId('stats-fallback-retry-btn')).toBeVisible();

    // FloodMap 정상 (에러 격리)
    await expect(page.getByTestId('error-fallback-container')).not.toBeVisible();
  });

  // [P1] 3.2 — 재시도 → 에러 유지 → URL 변경 시 복구
  test('재시도 시 에러가 유지되고, 클린 URL로 이동하면 복구된다', async ({ page }) => {
    await page.goto('/?__dev_statsError');

    const statsFallback = page.getByTestId('stats-fallback-container');
    await expect(statsFallback).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    await page.getByTestId('stats-fallback-retry-btn').click();
    await expect(statsFallback).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    // 클린 URL 이동 → 복구
    await page.goto('/');
    await expect(page.getByTestId('stats-panel-container')).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(statsFallback).not.toBeVisible();
  });
});
