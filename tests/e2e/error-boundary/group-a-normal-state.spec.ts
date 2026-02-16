import { test, expect, mockApiSuccess } from './fixtures';

test.describe('정상 상태 기준선', () => {
  test('에러 없이 앱 전체 UI가 정상 렌더링된다', async ({ page }) => {
    await mockApiSuccess(page);
    await page.goto('/');

    // 앱 컨테이너, 지도, 통계 패널 모두 표시
    await expect(page.getByTestId('app-container')).toBeVisible();
    await expect(page.getByTestId('floodmap-container')).toBeVisible();
    await expect(page.getByTestId('stats-panel-container')).toBeVisible();

    // 연도/월 입력 컨트롤 표시 및 활성화
    const yearInput = page.getByPlaceholder('연도');
    const monthInput = page.getByPlaceholder('월');
    await expect(yearInput).toBeVisible();
    await expect(monthInput).toBeVisible();
    await expect(yearInput).toBeEnabled();
    await expect(monthInput).toBeEnabled();

    // 에러 UI 없음
    await expect(page.getByTestId('error-root-container')).not.toBeVisible();
    await expect(page.getByTestId('error-fallback-container')).not.toBeVisible();
    await expect(page.getByTestId('stats-fallback-container')).not.toBeVisible();
    await expect(page.getByTestId('floodmap-error-container')).not.toBeVisible();
  });
});
