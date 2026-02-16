import { test, expect, ERROR_VISIBLE_TIMEOUT } from './fixtures';

test.describe('DEV 모드 상세 메시지', () => {
  // [P2] 9.1 — 각 에러별 DEV 전용 원본 메시지 표시
  test('DEV 모드에서 각 에러 타입의 원본 메시지가 표시된다', async ({ page }) => {
    // 루트 에러 → 'DEV_ROOT_ERROR'
    await page.goto('/?__dev_rootError');
    await expect(page.getByTestId('error-root-dev-message')).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(page.getByTestId('error-root-dev-message')).toContainText('DEV_ROOT_ERROR');

    // FloodMap 렌더 에러 → 'DEV_FLOODMAP_RENDER_ERROR'
    await page.goto('/?__dev_floodMapRenderError');
    await expect(page.getByTestId('error-fallback-message')).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(page.getByTestId('error-fallback-message')).toContainText('DEV_FLOODMAP_RENDER_ERROR');

    // Stats 에러 → 커스텀 폴백 표시
    await page.goto('/?__dev_statsError');
    await expect(page.getByTestId('stats-fallback-container')).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    // 맵 에러 → 'DEV_MAP_ERROR'
    await page.goto('/?__dev_mapError');
    await expect(page.getByTestId('floodmap-error-message')).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(page.getByTestId('floodmap-error-message')).toContainText('DEV_MAP_ERROR');
  });
});
