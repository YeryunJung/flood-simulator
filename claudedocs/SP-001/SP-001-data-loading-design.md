# 데이터 로딩 아키텍처 설계

## 개요

패널, 지도, 표 컴포넌트가 **동일한 침수 데이터**를 공유하며 월별로 동적 로드하는 구조 설계.

## 기술 스택

| 역할            | 기술           | 목적                                |
| --------------- | -------------- | ----------------------------------- |
| 서버 상태       | TanStack Query | 데이터 페칭, 캐싱                   |
| 클라이언트 상태 | Zustand        | UI 상태 (선택된 기간, 자치구, 필터) |

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                        App                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Zustand Store (UI State)                 │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐ │  │
│  │  │ period          │  │ filters (district, depth)   │ │  │
│  │  │ selectedDistrict│  │                             │ │  │
│  │  └─────────────────┘  └─────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           TanStack Query (Server State)               │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ useFloodDataQuery(year, month)                  │  │  │
│  │  │ - 자동 캐싱 (staleTime: Infinity)               │  │  │
│  │  │ - 에러/로딩 상태 관리                            │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌─────────────────────────┼─────────────────────────────┐  │
│  │          Suspense (단일 경계)                         │  │
│  │              ┌─────────┼─────────┐                    │  │
│  │              ▼         ▼         ▼                    │  │
│  │  ┌───────────────┐ ┌───────┐ ┌───────────────────┐   │  │
│  │  │ ControlPanel  │ │MapView│ │    DataTable      │   │  │
│  │  │ (패널)        │ │(지도) │ │    (표)           │   │  │
│  │  └───────────────┘ └───────┘ └───────────────────┘   │  │
│  │         └──────────────┴──────────────┘               │  │
│  │                 같은 데이터 공유                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 상태 분리 원칙

### TanStack Query (서버 상태)

- 침수 데이터 페칭 및 캐싱
- 로딩/에러 상태

### Zustand (클라이언트 상태)

- 선택된 연/월 (period)
- 선택된 자치구 (selectedDistrict)
- 필터 조건 (자치구, 침수 깊이 등)

## 파일 구조

```
src/
├── stores/
│   └── floodStore.ts          # Zustand 스토어
├── queries/
│   └── useFloodDataQuery.ts   # TanStack Query 훅
├── components/
│   ├── ControlPanel.tsx       # 패널 컴포넌트
│   ├── MapView.tsx            # 지도 컴포넌트
│   └── DataTable.tsx          # 표 컴포넌트
└── types/
    └── flood.ts               # 타입 정의 (기존)
```

## 구현 명세

### 1. Zustand Store

```typescript
// stores/floodStore.ts
interface Period {
  year: number
  month: number
}

interface FloodStore {
  // 선택 상태
  period: Period
  selectedDistrict: string | null // 선택된 자치구 이름

  // 필터 상태
  filters: {
    districts: District[]
    minDepth: number | null
    maxDepth: number | null
  }

  // 액션
  setPeriod: (period: Period) => void
  setSelectedDistrict: (district: string | null) => void
  setFilters: (filters: Partial<FloodStore['filters']>) => void
  resetFilters: () => void
}

// 사용 예시
setPeriod({ year: 2024, month: 7 })
setSelectedDistrict('강남구')
```

### 2. TanStack Query Hook

```typescript
// queries/useFloodDataQuery.ts
function useFloodDataQuery(year: number, month: number) {
  return useQuery({
    queryKey: ['floodData', year, month],
    queryFn: () => fetchFloodData(year, month),
    staleTime: Infinity, // 서버 데이터가 변경되지 않으므로 항상 fresh
    gcTime: 30 * 60 * 1000 // 30분 캐시 유지
  })
}

async function fetchFloodData(year: number, month: number): Promise<FloodData> {
  const monthStr = String(month).padStart(2, '0')
  const res = await fetch(`/flood_data_${year}_${monthStr}.json`)
  if (!res.ok) throw new Error('데이터 로드 실패')
  return res.json()
}
```

**staleTime: Infinity 사용 이유**:

- 정적 JSON 파일로 서버 데이터가 변경되지 않음
- 한 번 로드된 데이터는 항상 fresh 상태 유지

### 3. 컴포넌트 데이터 흐름

```typescript
// 예시: 컴포넌트에서 사용
function MapView() {
  // Zustand에서 선택된 기간 가져오기
  const { period, filters } = useFloodStore()

  // TanStack Query로 데이터 페칭
  const { data, isLoading, error } = useFloodDataQuery(period.year, period.month)

  // 필터 적용된 데이터
  const filteredPolygons = useMemo(() => {
    if (!data) return []
    return data.polygons.filter((p) => {
      if (filters.districts.length && !filters.districts.includes(p.info.district)) return false
      if (filters.minDepth && p.info.depth_cm < filters.minDepth) return false
      if (filters.maxDepth && p.info.depth_cm > filters.maxDepth) return false
      return true
    })
  }, [data, filters])

  // 렌더링...
}
```

## 데이터 흐름 시퀀스

```
1. 사용자가 월 선택
   └─▶ Zustand: setPeriod({ year: 2023, month: 7 }) 호출

2. 컴포넌트 리렌더
   └─▶ useFloodDataQuery(period.year, period.month) 실행

3. TanStack Query 캐시 확인
   ├─▶ 캐시 HIT: 즉시 반환 (staleTime: Infinity로 항상 fresh)
   └─▶ 캐시 MISS: fetch 실행 → 캐시 저장 → 반환

4. 모든 컴포넌트 동기화
   ├─▶ ControlPanel: 통계 업데이트
   ├─▶ MapView: 폴리곤 재렌더
   └─▶ DataTable: 목록 업데이트
```

## Suspense 경계 전략

### 단일 Suspense 경계 (채택)

```typescript
// App.tsx
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<AppSkeleton />}>
        <FloodDataContainer />
      </Suspense>
    </QueryClientProvider>
  )
}

function FloodDataContainer() {
  const { period } = useFloodStore()
  const { data } = useSuspenseQuery(floodDataQueryOptions(period.year, period.month))

  return (
    <main className='app-layout'>
      <ControlPanel floodData={data} />
      <MapView floodData={data} />
      <DataTable floodData={data} />
    </main>
  )
}
```

### 왜 단일 Suspense인가?

| 분리된 Suspense                 | 단일 Suspense     |
| ------------------------------- | ----------------- |
| 각각 스켈레톤 표시              | 통합 스켈레톤 1개 |
| **같은 데이터 → 동시 완료**     | 동시 완료         |
| 스켈레톤 3개 동시 사라짐 (어색) | 자연스러운 전환   |

**핵심**: 세 컴포넌트가 같은 `queryKey`를 사용하면 TanStack Query가 한 번만 fetch → 어차피 동시에 로딩 완료 → 분리 의미 없음

### 분리가 유효한 경우 (참고)

```typescript
// 각각 다른 API를 호출할 때만 분리 의미 있음
<Suspense fallback={<MapSkeleton />}>
  <MapView />  {/* useMapTileQuery() */}
</Suspense>

<Suspense fallback={<WeatherSkeleton />}>
  <WeatherPanel />  {/* useWeatherQuery() */}
</Suspense>
```

## 장점

| 특성                 | 설명                                          |
| -------------------- | --------------------------------------------- |
| **단일 진실 공급원** | 동일 데이터를 여러 컴포넌트가 공유            |
| **자동 캐싱**        | 같은 월 재선택 시 네트워크 요청 없음          |
| **상태 분리**        | 서버/클라이언트 상태 명확히 구분              |
| **선언적 로딩**      | isLoading, error 상태 자동 관리               |
| **단일 Suspense**    | 같은 데이터 의존 시 통합 경계로 자연스러운 UX |

## 구현 우선순위

1. **Zustand Store** 생성
2. **useFloodDataQuery** 훅 구현
3. **ControlPanel** - 월 선택 UI
4. **MapView** - 지도 렌더링
5. **DataTable** - 표 렌더링
