# data-testid 가이드

## 네이밍 규칙

`{page}-{feature}-{element}` 형태를 사용합니다.

| 세그먼트 | 설명 | 예시 |
|----------|------|------|
| page | 소속 페이지 또는 최상위 영역 | `app`, `floodmap`, `stats`, `error-fallback`, `error-root` |
| feature | 기능 영역 또는 상태 | `error`, `fallback`, `period` |
| element | 요소 종류 또는 동작 | `btn`, `input`, `container`, `message`, `icon`, `title` |

### 규칙 요약

- **kebab-case** 사용
- 접미사로 요소 역할 표시: `-btn`, `-input`, `-container`, `-message`, `-icon`, `-title`
- 에러 상태 요소는 feature 세그먼트에 `error` 또는 `fallback` 포함
- 공용 컴포넌트는 prop으로 `data-testid`를 전달받아 사용
- 정상 상태와 에러 상태 모두에 testid를 부여하여 상태 전환 검증 가능

---

## 페이지별 testid 목록

### App (앱 최상위)

| testid | 요소 | 용도 |
|--------|------|------|
| `app-container` | 앱 루트 div | 앱 정상 렌더링 검증 |

### ErrorFallback (위젯/페이지 레벨 에러 폴백)

| testid | 요소 | 용도 |
|--------|------|------|
| `error-fallback-container` | 에러 폴백 래퍼 div | 폴백 UI 노출 여부 확인 |
| `error-fallback-icon` | 에러 아이콘 (📡 / ⚠️) | 에러 타입별 아이콘 검증 |
| `error-fallback-title` | 에러 제목 h3 | 레벨별 제목 텍스트 검증 |
| `error-fallback-message` | 에러 메시지 p | 사용자 친화적 메시지 검증 |
| `error-fallback-retry-btn` | "다시 시도" 버튼 | 리트라이 동작 테스트 |

### RootErrorFallback (루트 레벨 에러 폴백)

| testid | 요소 | 용도 |
|--------|------|------|
| `error-root-container` | 풀스크린 오버레이 div | 루트 에러 UI 노출 확인 |
| `error-root-content` | 콘텐츠 래퍼 div | 내부 콘텐츠 영역 |
| `error-root-icon` | 에러 아이콘 (🚨) | 루트 에러 아이콘 검증 |
| `error-root-title` | 에러 제목 h1 | 제목 텍스트 검증 |
| `error-root-message` | 에러 메시지 p | 에러 메시지 검증 |
| `error-root-dev-message` | DEV 전용 에러 원문 p | 개발 환경에서 원본 에러 메시지 확인 |
| `error-root-actions` | 액션 버튼 그룹 div | 버튼 그룹 존재 확인 |
| `error-root-refresh-btn` | "페이지 새로고침" 버튼 | 페이지 새로고침 테스트 |
| `error-root-retry-btn` | "다시 시도" 버튼 | 리트라이 동작 테스트 |

### FloodMap (침수 지도)

| testid | 요소 | 용도 |
|--------|------|------|
| `floodmap-container` | 지도 정상 상태 컨테이너 | 정상 렌더링 검증, 에러 복구 확인 |
| `floodmap-error-container` | 맵 에러 컨테이너 div | 맵 에러 상태 확인 |
| `floodmap-error-icon` | 에러 아이콘 (📡 / ⚠️) | 에러 타입별 아이콘 검증 |
| `floodmap-error-message` | 에러 메시지 p | 에러 메시지 텍스트 검증 |
| `floodmap-error-retry-btn` | "다시 시도" 버튼 | 네트워크 에러 시 리트라이 테스트 |

### StatisticsPanel (통계 패널)

| testid | 요소 | 용도 |
|--------|------|------|
| `stats-panel-container` | 통계 패널 aside | 정상 렌더링 검증, 에러 복구 확인 |
| `stats-fallback-container` | 통계 폴백 aside | 폴백 UI 노출 확인 |
| `stats-fallback-message` | 폴백 메시지 영역 div | "데이터를 불러올 수 없습니다" 검증 |
| `stats-fallback-retry-btn` | "다시 시도" 버튼 | 리트라이 동작 테스트 |

---

## DEV 모드 에러 시뮬레이션 트리거

E2E 테스트에서 에러를 발생시키려면 URL 쿼리 파라미터를 사용합니다.

| 파라미터 | 에러 유형 | 영향 범위 |
|----------|----------|----------|
| `?rootError` | 앱 루트 에러 | RootErrorFallback 표시 |
| `?floodMapRenderError` | FloodMap 렌더 에러 | ErrorFallback (widget) 표시 |
| `?statsError` | StatisticsPanel 렌더 에러 | StatisticsPanelFallback 표시 |
| `?networkError` | 네트워크 에러 | FloodMap 에러 UI (📡) 표시 |
| `?apiError=403` | API 에러 (상태코드 지정) | FloodMap 에러 UI (⚠️) 표시 |
| `?mapError` | 지도 로딩 에러 | FloodMap 에러 UI 표시 |

---

## 사용 예시

### Playwright E2E 테스트

```typescript
// === 루트 에러 플로우 ===

// 루트 에러 트리거
await page.goto('/?rootError')

// 풀스크린 에러 오버레이 확인
await expect(page.getByTestId('error-root-container')).toBeVisible()
await expect(page.getByTestId('error-root-icon')).toContainText('🚨')
await expect(page.getByTestId('error-root-title')).toContainText('앱에 문제가 발생했습니다')

// 다시 시도 클릭
await page.getByTestId('error-root-retry-btn').click()

// === 위젯 에러 플로우 (FloodMap) ===

// FloodMap 렌더 에러 트리거
await page.goto('/?floodMapRenderError')

// 위젯 레벨 폴백 확인
await expect(page.getByTestId('error-fallback-container')).toBeVisible()
await expect(page.getByTestId('error-fallback-title')).toContainText('문제가 발생했습니다')

// 리트라이
await page.getByTestId('error-fallback-retry-btn').click()

// === 네트워크 에러 플로우 ===

// 네트워크 에러 트리거
await page.goto('/?networkError')

// FloodMap 자체 에러 UI 확인
await expect(page.getByTestId('floodmap-error-container')).toBeVisible()
await expect(page.getByTestId('floodmap-error-icon')).toContainText('📡')

// 리트라이 버튼 확인 및 클릭
await page.getByTestId('floodmap-error-retry-btn').click()

// === 통계 패널 에러 플로우 ===

// 통계 에러 트리거
await page.goto('/?statsError')

// 커스텀 폴백 UI 확인
await expect(page.getByTestId('stats-fallback-container')).toBeVisible()
await expect(page.getByTestId('stats-fallback-message')).toContainText('데이터를 불러올 수 없습니다')

// 리트라이
await page.getByTestId('stats-fallback-retry-btn').click()

// === 정상 상태 검증 ===

// 에러 복구 후 정상 UI 확인
await expect(page.getByTestId('app-container')).toBeVisible()
await expect(page.getByTestId('floodmap-container')).toBeVisible()
await expect(page.getByTestId('stats-panel-container')).toBeVisible()
```

### React Testing Library

```typescript
// 에러 폴백 렌더링 확인
expect(screen.getByTestId('error-fallback-container')).toBeInTheDocument()

// 네트워크 에러 아이콘 검증
expect(screen.getByTestId('error-fallback-icon')).toHaveTextContent('📡')

// 리트라이 버튼 클릭
fireEvent.click(screen.getByTestId('error-fallback-retry-btn'))

// 정상 상태 복구 확인
expect(screen.getByTestId('stats-panel-container')).toBeInTheDocument()
```
