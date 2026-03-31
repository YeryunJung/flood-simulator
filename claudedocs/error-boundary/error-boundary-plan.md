# Error Boundary 에러 처리 시스템

> 침수 시뮬레이터 앱의 3계층 에러 처리 구조를 설명하는 문서입니다.
> 이 문서만으로 에러 바운더리 로직 전체를 파악할 수 있습니다.
>
> 관련 PR: [#12 에러 바운더리 시스템 구현 및 E2E 테스트](https://github.com/YeryunJung/flood-simulator/pull/12)

---

## 1. 전체 구조

```
+------------------------------------------------------------------+
|  page.tsx → dynamic(() => import('@/App'), { ssr: false })       |
|                                                                  |
|  L1  Root ErrorBoundary  (App.tsx 외부, providers.tsx)            |
|  → RootErrorFallback: 풀스크린 오버레이 + "페이지 새로고침"              |
|                                                                  |
|  +----------------------------+  +-----------------------------+ |
|  | L2  FloodMap               |  | L2  StatisticsPanel         | |
|  | ErrorBoundary (App.tsx)    |  | ErrorBoundary (App.tsx)     | |
|  |                            |  |                             | |
|  | → ErrorFallback            |  | → StatisticsPanelFallback   | |
|  |   "다시 시도" 버튼            |  |   "다시 시도" 버튼              | |
|  |   retry 시 isRetryable     |  |   retry 시 isRetryable       | |
|  |   체크 후 쿼리 무효화          |  |   체크 후 쿼리 무효화            | |
|  |                            |  |   resetKeys=[year,month,    | |
|  |  +----------------------+  |  |            retryCount]      | |
|  |  | L3-B FloodMap 내부   |  |  |                             | |
|  |  | (ErrorBoundary 아님)  |  |  |                             | |
|  |  | 맵 초기화 에러만 처리    |  |  |                             | |
|  |  +----------------------+  |  |                             | |
|  +----------------------------+  +-----------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | L3-A  ApiErrorOverlay (app__content 위 오버레이)              | |
|  | 서버 API 에러 통합 처리 (NetworkError, ApiError)               | |
|  | "다시 시도" 1번 → FloodMap + Stats 양쪽 재요청                  | |
|  +------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

---

## 2. 에러 타입 분류 체계

> 소스: `client/src/api/errors.ts`

### 2-1. 에러 클래스

| 클래스 | 발생 조건 | 예시 |
|:---|:---|:---|
| `NetworkError` | `fetch()` 자체가 실패 (서버 다운, 오프라인) | `throw new NetworkError()` |
| `ApiError` | HTTP 응답은 왔으나 status가 에러 | `new ApiError(403, 'Forbidden', '...')` |
| `Error` (기본) | 렌더링 에러, 파싱 실패, 맵 초기화 실패 등 | `new Error('DEV_ROOT_ERROR')` |

### 2-2. 재시도 가능 여부 판정 (`isRetryable`)

```typescript
function isRetryable(error: unknown): boolean {
  if (isNetworkError(error)) return true          // 네트워크 → 재시도 가능
  if (isApiError(error)) return error.isServerError // 5xx → 재시도 가능
                                  || error.status === 429  // 429 Too Many Requests → 재시도 가능
  return false                                     // 그 외 (4xx, 렌더 에러, 맵 에러) → 불가
}
```

**재시도 판정 결과:**

| 에러 타입 | `isRetryable` | 이유 |
|:---|:---:|:---|
| `NetworkError` | **true** | 네트워크 복구되면 성공 가능 |
| `ApiError` 5xx | **true** | 서버 일시 장애, 복구 가능 |
| `ApiError` 429 | **true** | Rate limit, 시간 지나면 성공 |
| `ApiError` 4xx (403 등) | false | 클라이언트 요청 자체가 잘못됨 |
| `Error` (렌더, 맵) | false | 코드/환경 문제, 재시도 무의미 |

### 2-3. 사용자 메시지 (`getUserFriendlyMessage`)

| 환경 | 동작 |
|:---|:---|
| **DEV** (`process.env.NODE_ENV === 'development'`) | `error.message` 원본 그대로 표시 |
| **PROD** | 에러 타입별 안전한 한국어 메시지 반환 (아래 표 참고) |

| 에러 타입 | PROD 메시지 |
|:---|:---|
| `NetworkError` | "네트워크 연결을 확인해주세요" |
| `ApiError` 404 | "요청하신 데이터를 찾을 수 없습니다" |
| `ApiError` 5xx | "서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요" |
| `ApiError` 4xx | "잘못된 요청입니다" |
| 기타 `Error` | "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요" |

---

## 3. 각 계층 상세

### L1 루트 — 앱 전체가 죽었을 때

> 소스: `App.tsx` (ErrorBoundary 배치), `ErrorBoundary.tsx` (RootErrorFallback)
> 진입점: `page.tsx` → `dynamic(() => import('@/App'), { ssr: false })`

React 컴포넌트 트리 최상단에서 에러를 잡는다.
App 컴포넌트 자체(L2 위젯 ErrorBoundary보다 위)에서 throw되는 에러가 여기 도달한다.
여기서 에러가 잡히면 **앱 전체가 사라지고** 풀스크린 오버레이만 남는다.

> **SSR 참고**: `page.tsx`에서 `ssr: false`로 App을 불러오고 있어 현재 서버 렌더링은 비활성 상태다.
> TODO(SSR-001)에서 서버 데이터 fetch 구현 후 제거 예정.

**배치 구조 (page.tsx → App.tsx):**
```tsx
// page.tsx
const App = dynamic(() => import('@/App'), { ssr: false })

// App.tsx — L1 Root ErrorBoundary는 App 외부의 providers.tsx에서 감싸는 구조
// App 컴포넌트 내에서 throw하면 RootErrorFallback이 표시됨
```

**UI 요소:**
- 🚨 아이콘
- 제목: "앱에 문제가 발생했습니다"
- PROD 메시지 + "문제가 계속되면 관리자에게 문의해주세요."
- DEV 전용: `error.message` 원본 표시
- **"페이지 새로고침" 버튼 1개** → `window.location.reload()` 호출

**왜 "다시 시도" 버튼이 없는가:**
루트 에러는 App 컴포넌트 자체를 렌더링할 수 없는 상태다.
ErrorBoundary의 `reset()`으로 에러 상태를 지워도, App을 다시 렌더링하면 동일 조건에서 동일 에러가 재발한다.
따라서 소프트 리셋은 의미가 없고, 브라우저 하드 리로드(`window.location.reload()`)만 제공한다.

---

### L2 위젯 — 한쪽 영역만 죽었을 때

> 소스: `App.tsx` (ErrorBoundary 배치 + fallback 함수), `ErrorBoundary.tsx` (ErrorFallback)

FloodMap과 StatisticsPanel 각각을 `<ErrorBoundary>`로 감싸고 있다.
한쪽이 에러나도 **나머지 영역은 정상 동작**한다. (에러 격리)

#### FloodMap ErrorBoundary

```tsx
<ErrorBoundary
  level="widget"
  fallback={({ error, reset }) => {
    const retry = () => {
      if (isRetryable(error)) {
        queryClient.invalidateQueries()  // 데이터 관련 에러만 쿼리 무효화
      }
      reset()  // ErrorBoundary 에러 상태 초기화 → 자식 재렌더링
    }
    return <ErrorFallback error={error} onReset={retry} level="widget" />
  }}
>
  <FloodMap onRetry={handleRetry} />
</ErrorBoundary>
```

- **Fallback UI**: `ErrorFallback` — ⚠️ 아이콘 + "문제가 발생했습니다" + "다시 시도" 버튼
- **"다시 시도" 클릭 시 동작:**
  - `isRetryable(error)` = true → `queryClient.invalidateQueries()` + `reset()`
  - `isRetryable(error)` = false → `reset()`만 (쿼리 무효화 하지 않음)
- **격리**: Stats 패널은 영향 없음

#### Stats ErrorBoundary

```tsx
<ErrorBoundary
  level="widget"
  resetKeys={[period.year, period.month]}
  fallback={({ error, reset }) => (
    <StatisticsPanelFallback
      onRetry={() => {
        if (isRetryable(error)) {
          queryClient.invalidateQueries()
        }
        reset()
      }}
    />
  )}
>
  <StatisticsPanel />
</ErrorBoundary>
```

- **Fallback UI**: `StatisticsPanelFallback` — 아이콘 없음, "데이터를 불러올 수 없습니다" + "다시 시도" 버튼
- **"다시 시도" 클릭 시 동작**: FloodMap과 동일한 `isRetryable` 체크 로직
- **`resetKeys`**: `[period.year, period.month, retryCount]` — 사용자가 연도/월을 변경하거나 ApiErrorOverlay에서 재시도하면 에러 상태 자동 초기화
- **격리**: FloodMap은 영향 없음

---

### L3-A 서버 API 에러 — ApiErrorOverlay가 전담

> 소스: `ApiErrorOverlay.tsx`, `useApiErrorOverlay.ts`, `App.tsx`

서버 API 에러(NetworkError, ApiError)는 FloodMap/Stats 개별이 아니라
**`ApiErrorOverlay` 하나로 통합 처리**한다. (Hyeondoonge 리뷰 C안 반영)

`useApiErrorOverlay` 훅이 React Query의 에러 상태를 구독하고,
서버 API 에러가 감지되면 `app__content` 위에 오버레이 1개를 띄운다.

**에러 감지 로직 (`useApiErrorOverlay`):**
```typescript
const { error } = useQuery(floodQueryOptions(deferredPeriod))
const apiError = error && isServerApiError(error) ? error : null
```

**오버레이 UI (`ApiErrorOverlay`):**
- 아이콘: `isNetwork ? '📡' : '⚠️'`
- 제목: 네트워크 오류 / 서버 오류
- 메시지: `getUserFriendlyMessage(apiError, process.env.NODE_ENV === 'development')`
- 재시도 버튼: `canRetry && onRetry` 일 때만 표시

**재시도 클릭 시 동작:**
`onRetry` → App.tsx의 `handleGlobalRetry()` → `queryClient.invalidateQueries({ queryKey: ['floodData'] })` → FloodMap + StatisticsPanel 양쪽 재요청

**에러 → 정상 전환 감지:**
`useApiErrorOverlay`가 에러 → 정상 전환을 감지하면 `onErrorCleared` 콜백 호출 → `retryCount` 증가 → Stats ErrorBoundary의 `resetKeys` 변경으로 자동 리셋

---

### L3-B 네이버 맵 에러 — FloodMap 내부에서 처리

> 소스: `FloodMap.tsx`, `useNaverMap.tsx`

네이버 맵 초기화 실패는 서버 API와 무관한 에러이므로 FloodMap 내부에서 자체 처리한다.

`mapError` — 네이버 맵 초기화 실패 (소스: `useNaverMap.tsx`)
- API 키 누락: 환경변수(`NAVER_MAPS_CLIENT_ID`)가 없을 때
- 스크립트 로드 실패: 네이버 CDN에서 지도 JS를 못 받았을 때 (네트워크 문제, CDN 장애 등)
- 인증 실패: 키는 있지만 도메인 불일치 또는 키 만료
- 맵 생성자 예외: `new naver.maps.Map()` 호출 자체가 실패

> 위 4가지 모두 `setError(new Error(...))` → `mapError` 상태로 관리되며, throw하지 않는다.

**에러 메시지 결정:**
```typescript
const errorMessage = process.env.NODE_ENV === 'development'
  ? mapError.message
  : '지도를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.'
```

- 아이콘: ⚠️ (고정)
- 재시도 버튼: **없음** (맵 에러는 재시도로 해결 불가)
- Stats 패널: 정상 동작

> **L2 vs L3 차이점:** L2는 렌더 중 `throw`로 에러를 던져서 ErrorBoundary가 잡는다.
> L3-A는 오버레이로, L3-B는 컴포넌트 내부 state로 에러를 관리해서 자체 UI를 보여준다.

---

## 4. 에러 요약 테이블

| 계층 | 에러 종류 | 발생 위치 | 아이콘 | 복구 수단 | Fallback UI | 격리 |
|:---:|:---|:---|:---:|:---:|:---|:---|
| **L1** | 앱 렌더링 에러 | `App.tsx` throw | 🚨 | 새로고침 | `RootErrorFallback` (풀스크린) | 앱 전체 차단 |
| **L2** | FloodMap 렌더 에러 | `FloodMap.tsx` throw | ⚠️ | 재시도 | `ErrorFallback` (위젯 영역) | Stats 정상 |
| **L2** | Stats 렌더 에러 | `StatisticsPanel.tsx` throw | 없음 | 재시도 | `StatisticsPanelFallback` (사이드바) | FloodMap 정상 |
| **L3-A** | 네트워크 에러 | `flood.ts` fetch 실패 | 📡 | **재시도** | `ApiErrorOverlay` (오버레이) | 양쪽 동시 처리 |
| **L3-A** | API 5xx 에러 | `flood.ts` 서버 에러 | ⚠️ | **재시도** | `ApiErrorOverlay` (오버레이) | 양쪽 동시 처리 |
| **L3-A** | API 4xx 에러 | `flood.ts` 클라이언트 에러 | ⚠️ | **없음** | `ApiErrorOverlay` (오버레이) | 양쪽 동시 처리 |
| **L3-B** | 맵 초기화 에러 | `useNaverMap.tsx` | ⚠️ | **없음** | FloodMap 내부 에러 UI | Stats 정상 |

---

## 5. 소스 파일 맵

| 파일 | 역할 |
|:---|:---|
| `page.tsx` | Next.js 진입점, `ssr: false` dynamic import (TODO: SSR-001) |
| `App.tsx` | L2 위젯 ErrorBoundary 2개 배치, ApiErrorOverlay 연결, `isRetryable` 기반 retry 전략 |
| `ErrorBoundary.tsx` | ErrorBoundary 클래스, ErrorFallback, RootErrorFallback 컴포넌트 |
| `ApiErrorOverlay.tsx` | L3-A 서버 API 에러 오버레이 (NetworkError, ApiError 통합 표시) |
| `useApiErrorOverlay.ts` | 서버 API 에러 감지 훅, 에러→정상 전환 감지 |
| `errors.ts` | `ApiError`, `NetworkError` 클래스, `isRetryable`, `getUserFriendlyMessage` |
| `FloodMap.tsx` | L3-B 맵 에러 내부 처리, L2용 `throw` |
| `StatisticsPanel.tsx` | L2용 `throw` |
| `useNaverMap.tsx` | 네이버 맵 초기화 에러를 `Error` 객체로 관리 |
| `flood.ts` | API 호출, `NetworkError`/`ApiError` throw, SSR 빈 데이터 반환 |

---

## 6. DEV 에러 시뮬레이션

> 모든 DEV 쿼리 파라미터는 `__dev_` 접두사를 사용합니다.
> `process.env.NODE_ENV === 'development'` 조건 안에 있어 프로덕션 빌드에서 tree-shake 됩니다.

| 쿼리 파라미터 | 계층 | 에러 클래스 | 발생 위치 | 아이콘 | 복구 수단 | 비고 |
|:---|:---:|:---|:---|:---:|:---:|:---|
| `?__dev_rootError` | L1 | `Error('DEV_ROOT_ERROR')` | `App.tsx` | 🚨 | 새로고침 | |
| `?__dev_floodMapRenderError` | L2 | `Error('DEV_FLOODMAP_RENDER_ERROR')` | `FloodMap.tsx` | ⚠️ | 재시도 | |
| `?__dev_statsError` | L2 | `Error('DEV_STATS_ERROR')` | `StatisticsPanel.tsx` | 없음 | 재시도 | |
| `?__dev_networkError` | L3 | `NetworkError` | `flood.ts` | 📡 | **재시도** | |
| `?__dev_apiError=403` | L3 | `ApiError(403, ...)` | `flood.ts` | ⚠️ | **없음** | |
| `?__dev_apiError=500` | L3 | `ApiError(500, ...)` | `flood.ts` | ⚠️ | **재시도** | |
| `?__dev_mapError` | L3 | `Error('DEV_MAP_ERROR')` | `useNaverMap.tsx` | ⚠️ | **없음** | |
| `?__dev_parseError` | L3 | `Error('서버 응답을 파싱할 수 없습니다')` | `flood.ts` | ⚠️ | **없음** | E2E 미포함 |
| `?__dev_emptyData` | — | 정상 응답 (빈 데이터) | `flood.ts` | — | — | E2E 미포함 |

**조합 사용 가능:**
- `?__dev_floodMapRenderError&__dev_statsError` → 양쪽 위젯 동시 에러
- `?__dev_rootError&__dev_floodMapRenderError` → 루트 에러 우선 (위젯 에러 렌더 안 됨)

---

## 7. data-testid 레퍼런스

### 정상 상태

| testid | 설명 |
|:---|:---|
| `app-container` | 앱 전체 컨테이너 |
| `floodmap-container` | FloodMap 정상 상태 컨테이너 |
| `stats-panel-container` | 통계 패널 정상 상태 컨테이너 |

### L1 루트 에러 (RootErrorFallback)

| testid | 설명 |
|:---|:---|
| `error-root-container` | 풀스크린 오버레이 컨테이너 |
| `error-root-content` | 콘텐츠 래퍼 |
| `error-root-icon` | 🚨 아이콘 |
| `error-root-title` | "앱에 문제가 발생했습니다" |
| `error-root-message` | 사용자 메시지 (PROD용) |
| `error-root-dev-message` | DEV 전용 `error.message` 원본 |
| `error-root-actions` | 버튼 영역 |
| `error-root-refresh-btn` | "페이지 새로고침" 버튼 |

### L2 FloodMap 위젯 에러 (ErrorFallback)

| testid | 설명 |
|:---|:---|
| `error-fallback-container` | 위젯 에러 컨테이너 |
| `error-fallback-icon` | ⚠️ 아이콘 |
| `error-fallback-title` | "문제가 발생했습니다" |
| `error-fallback-message` | 에러 메시지 |
| `error-fallback-retry-btn` | "다시 시도" 버튼 |

### L2 통계 패널 에러 (StatisticsPanelFallback)

| testid | 설명 |
|:---|:---|
| `stats-fallback-container` | 커스텀 폴백 컨테이너 |
| `stats-fallback-message` | "데이터를 불러올 수 없습니다" |
| `stats-fallback-retry-btn` | "다시 시도" 버튼 |

### L3-A ApiErrorOverlay (서버 API 에러)

| testid | 설명 |
|:---|:---|
| `api-error-overlay` | 오버레이 컨테이너 |
| `api-error-overlay-icon` | 📡 (네트워크) 또는 ⚠️ (서버) |
| `api-error-overlay-message` | 에러 메시지 |
| `api-error-overlay-retry-btn` | "다시 시도" 버튼 (retryable 에러만 표시) |

### L3-B FloodMap 내부 에러 (맵 초기화)

| testid | 설명 |
|:---|:---|
| `floodmap-error-container` | FloodMap 내부 에러 컨테이너 |
| `floodmap-error-icon` | ⚠️ |
| `floodmap-error-message` | 에러 메시지 |

---

## 8. E2E 테스트 시나리오

### P0 - 필수 (배포 차단)

| 시나리오 | 테스트 파일 | 검증 포인트 |
|:---|:---|:---|
| 정상 상태 앱 로드 | `group-a-normal-state` | 에러 없이 전체 UI 렌더링 |
| 루트 에러 → 풀스크린 오버레이 | `group-b-root-error-display` | 🚨 + 제목 + 메시지 + 새로고침 버튼 + 앱 숨김 |
| 루트 에러 → 새로고침 | `group-c-root-error-actions` | `window.location.reload()` 동작 |
| FloodMap 렌더 에러 → 위젯 폴백 | `group-d-floodmap-render-error` | ErrorFallback + Stats 격리 |
| FloodMap 렌더 에러 → 재시도/복구 | `group-d-floodmap-render-error` | 재시도 동작 + URL 변경 시 복구 |
| 네트워크 에러 → L3 내부 UI | `group-f-floodmap-network-error` | 📡 아이콘 + 재시도 버튼 |

### P1 - 중요

| 시나리오 | 테스트 파일 | 검증 포인트 |
|:---|:---|:---|
| Stats 에러 → 커스텀 폴백 | `group-e-stats-error` | 커스텀 UI + FloodMap 격리 |
| Stats 에러 → 재시도/복구 | `group-e-stats-error` | 재시도 + URL 변경 시 데이터 복구 |
| API 403 에러 → 재시도 불가 | `group-g-floodmap-api-map-error` | ⚠️ 아이콘 + 재시도 버튼 없음 |
| 에러 타입별 아이콘 정확성 | `group-h-error-icon-types` | 6개 에러별 올바른 아이콘 |

### P2 - 보조

| 시나리오 | 테스트 파일 | 검증 포인트 |
|:---|:---|:---|
| 맵 초기화 에러 → L3 내부 UI | `group-g-floodmap-api-map-error` | ⚠️ + 재시도 불가 + Stats 정상 |
| 양쪽 위젯 동시 에러 | `group-i-multiple-errors` | 독립 격리 + 재시도 격리 |
| 루트 + 위젯 동시 에러 | `group-i-multiple-errors` | 루트 에러 우선 |
| DEV 모드 상세 메시지 | `group-j-dev-mode-messages` | DEV 전용 메시지 노출 |
