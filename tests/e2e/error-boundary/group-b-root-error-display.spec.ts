import { test, expect, ERROR_VISIBLE_TIMEOUT } from './fixtures';

test.describe('L1 루트 에러 — 풀스크린 오버레이', () => {
  test('루트 에러 시 풀스크린 오버레이 UI가 올바르게 표시된다', async ({ page }) => {
    await page.goto('/?__dev_rootError');

    const errorContainer = page.getByTestId('error-root-container');
    await expect(errorContainer).toBeVisible({ timeout: ERROR_VISIBLE_TIMEOUT });

    // 🚨 아이콘 + 제목 + 메시지
    await expect(page.getByTestId('error-root-icon')).toContainText('🚨');
    await expect(page.getByTestId('error-root-title')).toHaveText('앱에 문제가 발생했습니다');
    await expect(page.getByTestId('error-root-message')).not.toBeEmpty();

    // DEV 전용: 에러 원본 메시지
    await expect(page.getByTestId('error-root-dev-message')).toContainText('DEV_ROOT_ERROR');

    // "페이지 새로고침" 버튼
    await expect(page.getByTestId('error-root-actions')).toBeVisible();
    await expect(page.getByTestId('error-root-refresh-btn')).toContainText('페이지 새로고침');

    // 앱 콘텐츠 완전히 숨김
    await expect(page.getByTestId('app-container')).not.toBeVisible();
    await expect(page.getByTestId('floodmap-container')).not.toBeVisible();
    await expect(page.getByTestId('stats-panel-container')).not.toBeVisible();
  });
});
