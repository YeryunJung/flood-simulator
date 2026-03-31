// ErrorBoundary E2E 테스트 공용 fixture

import { test as base, type Page } from '@playwright/test';

/** React Query 재시도 고려한 타임아웃 */
export const ERROR_VISIBLE_TIMEOUT = 15_000;

const FLOOD_API_PATTERN = '**/api/flood-data**';

const VALID_FLOOD_DATA = {
  metadata: {
    title: '2023년 7월 서울 침수 흔적 데이터',
    year_month: '2023-07',
    total_polygons: 1,
    coordinate_system: 'WGS84 (EPSG:4326)',
    format: 'lat, lng',
    description: 'E2E test data',
    note: 'test',
  },
  polygons: [
    {
      id: 0,
      sgg_oid: 1,
      paths: [
        [37.5123, 127.0287],
        [37.5122, 127.0287],
        [37.5121, 127.0288],
        [37.5123, 127.0287],
      ],
      info: {
        address: '394-21 대',
        district: '강남구',
        depth_cm: 27.1,
        area_km2: 39.5,
        start_date: '20230713',
        end_date: '20230714',
      },
    },
  ],
};

/** 정상 상태 테스트용: API가 유효한 데이터를 반환하도록 모킹 */
export async function mockApiSuccess(page: Page) {
  await page.route(FLOOD_API_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(VALID_FLOOD_DATA),
    })
  );
}

export const test = base;
export { expect } from '@playwright/test';
