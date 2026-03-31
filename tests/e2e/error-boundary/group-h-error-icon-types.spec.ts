import { test, expect, ERROR_VISIBLE_TIMEOUT } from './fixtures';

test.describe('에러 타입별 아이콘', () => {
  // [P1] 7.1 — 각 에러별 올바른 아이콘 표시
  test('각 에러 타입에 맞는 아이콘이 표시된다', async ({ page }) => {
    // L1 루트 에러 → 🚨
    await page.goto('/?__dev_rootError');
    await expect(page.getByTestId('error-root-icon')).toContainText('🚨');

    // L2 FloodMap 렌더 에러 → ⚠️
    await page.goto('/?__dev_floodMapRenderError');
    await expect(page.getByTestId('error-fallback-icon')).toContainText('⚠️');

    // L3 네트워크 에러 → 📡 (공용 오버레이)
    await page.goto('/?__dev_networkError');
    await expect(page.getByTestId('api-error-overlay-icon')).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(page.getByTestId('api-error-overlay-icon')).toContainText('📡');

    // L3 API 403 에러 → ⚠️ (공용 오버레이)
    await page.goto('/?__dev_apiError=403');
    await expect(page.getByTestId('api-error-overlay-icon')).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(page.getByTestId('api-error-overlay-icon')).toContainText('⚠️');

    // L3 맵 초기화 에러 → ⚠️ (FloodMap 내부)
    await page.goto('/?__dev_mapError');
    await expect(page.getByTestId('floodmap-error-icon')).toContainText('⚠️');

    // L2 Stats 에러 → 아이콘 없음 (텍스트만)
    await page.goto('/?__dev_statsError');
    await expect(page.getByTestId('stats-fallback-container')).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });
    await expect(page.getByTestId('stats-fallback-message')).toContainText('데이터를 불러올 수 없습니다');
  });
});
