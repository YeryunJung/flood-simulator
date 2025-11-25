# 통계 패널 (SP-001) 설계 명세서

## 개요

서울시 침수 피해 정보 사이트의 통계 패널 컴포넌트 설계 명세서입니다. 데이터 모델, 컴포넌트 구조, 구현 패턴을 다룹니다.

---

## 1. 데이터 모델 설계

### 1.1 월별 통계 요약

```typescript
/**
 * 월별 침수 통계 요약
 * PRD 요구사항: 침수 발생 자치구 수, 총 침수 지점 수, 평균 침수 깊이
 */
export interface MonthlyStatistics {
  /** 연월 (YYYY-MM) */
  yearMonth: string

  /** 침수가 발생한 자치구 수 */
  affectedDistrictCount: number

  /** 총 침수 지점(폴리곤) 수 */
  totalFloodPoints: number

  /** 평균 침수 깊이 (cm) */
  averageDepth: number

  /** 총 침수 면적 (m²) */
  totalArea: number

  /** 최대 침수 깊이 (cm) */
  maxDepth: number
}
```

### 1.2 구별 통계

```typescript
/**
 * 위험도 레벨 (PRD: 낮음/보통/심각)
 *
 * const 객체를 사용하는 이유 (enum 대신):
 * 1. 런타임 오버헤드 없음 - enum은 실제 JavaScript 객체를 생성
 * 2. tree-shaking 가능 - 사용하지 않는 값 제거 가능
 * 3. 명시적 - 일반 JavaScript 객체로 동작
 * 4. 번들 크기 최적화 - 컴파일 후 그대로 유지
 */
export const RiskLevel = {
  LOW: 'low',
  MODERATE: 'moderate',
  SEVERE: 'severe'
} as const

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel]

/**
 * 구별 침수 현황
 * PRD 요구사항: 최대 침수 깊이, 위험도 뱃지
 */
export interface DistrictStatistics {
  /** 자치구 이름 */
  district: string

  /** 침수 지점 수 */
  floodPointCount: number

  /** 최대 침수 깊이 (cm) */
  maxDepth: number

  /** 평균 침수 깊이 (cm) */
  averageDepth: number

  /** 총 침수 면적 (m²) */
  totalArea: number

  /** 위험도 레벨 */
  riskLevel: RiskLevel
}
```

### 1.3 유틸리티 함수

```typescript
/**
 * 위험도 계산
 * 기준:
 * - 0-30cm: 낮음 (low)
 * - 30-80cm: 보통 (moderate)
 * - 80cm+: 심각 (severe)
 */
export function calculateRiskLevel(depthCm: number): RiskLevel {
  if (depthCm < 30) return RiskLevel.LOW
  if (depthCm < 80) return RiskLevel.MODERATE
  return RiskLevel.SEVERE
}

/**
 * 월별 통계 계산
 */
export function calculateMonthlyStatistics(floodData: FloodData): MonthlyStatistics {
  const { polygons } = floodData

  // 자치구별 그룹화
  const districtSet = new Set(polygons.map((p) => p.info.district))

  // 평균 침수 깊이
  const totalDepth = polygons.reduce((sum, p) => sum + p.info.depth_cm, 0)
  const averageDepth = polygons.length > 0 ? totalDepth / polygons.length : 0

  // 총 면적
  const totalArea = polygons.reduce((sum, p) => sum + p.info.area_m2, 0)

  // 최대 깊이
  const maxDepth = Math.max(...polygons.map((p) => p.info.depth_cm), 0)

  return {
    yearMonth: floodData.metadata.year_month,
    affectedDistrictCount: districtSet.size,
    totalFloodPoints: polygons.length,
    averageDepth: Math.round(averageDepth * 10) / 10,
    totalArea: Math.round(totalArea * 10) / 10,
    maxDepth
  }
}

/**
 * 구별 통계 계산
 */
export function calculateDistrictStatistics(floodData: FloodData): DistrictStatistics[] {
  const districtMap = new Map<string, FloodPolygon[]>()

  // 자치구별 그룹화
  floodData.polygons.forEach((polygon) => {
    const district = polygon.info.district
    if (!districtMap.has(district)) {
      districtMap.set(district, [])
    }
    districtMap.get(district)!.push(polygon)
  })

  // 통계 계산
  const statistics: DistrictStatistics[] = []

  // Map.forEach는 (value, key) 순서임 - polygons(value), district(key)
  districtMap.forEach((polygons, district) => {
    const depths = polygons.map((p) => p.info.depth_cm)
    const maxDepth = Math.max(...depths)
    const totalDepth = depths.reduce((sum, d) => sum + d, 0)
    const averageDepth = totalDepth / depths.length
    const totalArea = polygons.reduce((sum, p) => sum + p.info.area_m2, 0)

    statistics.push({
      district,
      floodPointCount: polygons.length,
      maxDepth,
      averageDepth: Math.round(averageDepth * 10) / 10,
      totalArea: Math.round(totalArea * 10) / 10,
      riskLevel: calculateRiskLevel(maxDepth)
    })
  })

  // PRD 요구사항: 침수 깊이가 깊은 순서로 정렬
  return statistics.sort((a, b) => b.maxDepth - a.maxDepth)
}
```

---

## 2. 컴포넌트 아키텍처

### 2.1 컴포넌트 계층 구조

```
StatisticsPanel (메인 컨테이너)
├── MonthlySummary (월별 요약 섹션)
└── DistrictList (구별 현황 리스트 섹션)
```

**참고**: 모든 하위 UI 요소(StatCard, DistrictCard, RiskBadge)는 각 컴포넌트 파일 내부의 헬퍼 함수로 구현합니다. 별도 컴포넌트 파일로 분리하지 않습니다.

**이유**:

1. **응집도**: 관련 로직을 한 파일에 모아 이해하기 쉬움
2. **단순성**: 3개 파일만으로 전체 기능 구현 (StatisticsPanel, MonthlySummary, DistrictList)
3. **재사용성 없음**: StatCard, DistrictCard, RiskBadge는 각각 한 곳에서만 사용
4. **과도한 추상화 방지**: 초기 단계에서 불필요한 파일 분리 지양

### 2.2 StatisticsPanel 메인 컴포넌트

**파일**: `src/components/StatisticsPanel/StatisticsPanel.tsx`

```typescript
import { MonthlySummary } from './MonthlySummary'
import { DistrictList } from './DistrictList'
import type { FloodData } from '../../types/flood'

interface StatisticsPanelProps {
  /** 현재 선택된 월의 침수 데이터 */
  floodData: FloodData

  /** 패널 너비 (선택사항) */
  width?: number
}

/**
 * 통계 패널 (우측 사이드바)
 * PRD SP-001: 월별 요약 + 구별 침수 현황 리스트
 */
export function StatisticsPanel({ floodData, width = 400 }: StatisticsPanelProps) {
  return (
    <aside className='statistics-panel' style={{ width: `${width}px` }} aria-label='침수 통계 패널'>
      {/* 월별 요약 */}
      <MonthlySummary floodData={floodData} />

      {/* 구별 침수 현황 리스트 */}
      <DistrictList floodData={floodData} />
    </aside>
  )
}
```

### 2.3 MonthlySummary 컴포넌트

**파일**: `src/components/StatisticsPanel/MonthlySummary.tsx`

```typescript
import { calculateMonthlyStatistics } from '../../utils/statistics'
import type { FloodData } from '../../types/flood'

interface MonthlySummaryProps {
  floodData: FloodData
}

/**
 * 월별 요약 통계
 * PRD: 침수 자치구 수, 총 침수 지점 수, 평균 침수 깊이
 */
export function MonthlySummary({ floodData }: MonthlySummaryProps) {
  const stats = calculateMonthlyStatistics(floodData)

  return (
    <section className='monthly-summary' aria-labelledby='monthly-summary-title'>
      <h2 id='monthly-summary-title' className='summary-title'>
        {formatYearMonth(stats.yearMonth)} 침수 현황
      </h2>

      <div className='stat-cards'>
        <StatCard
          label='침수 발생 자치구'
          value={stats.affectedDistrictCount}
          unit='개 구'
          icon='🏘️'
        />

        <StatCard label='총 침수 지점' value={stats.totalFloodPoints} unit='개' icon='📍' />

        <StatCard
          label='평균 침수 깊이'
          value={stats.averageDepth}
          unit='cm'
          icon='📏'
          precision={1}
        />
      </div>
    </section>
  )
}

/**
 * 개별 통계 카드
 */
interface StatCardProps {
  label: string
  value: number
  unit: string
  icon?: string
  precision?: number
}

function StatCard({ label, value, unit, icon, precision = 0 }: StatCardProps) {
  const formattedValue =
    precision > 0 ? value.toFixed(precision) : Math.round(value).toLocaleString()

  return (
    <div className='stat-card'>
      {icon && (
        <span className='stat-icon' aria-hidden='true'>
          {icon}
        </span>
      )}
      <div className='stat-content'>
        <div className='stat-label'>{label}</div>
        <div className='stat-value'>
          {formattedValue}
          <span className='stat-unit'>{unit}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * YYYY-MM → YYYY년 MM월
 */
function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return `${year}년 ${parseInt(month)}월`
}
```

### 2.4 DistrictList 컴포넌트

**파일**: `src/components/StatisticsPanel/DistrictList.tsx`

```typescript
import { calculateDistrictStatistics } from '../../utils/statistics'
import { RiskLevel } from '../../types/statistics'
import type { FloodData } from '../../types/flood'
import type { DistrictStatistics, RiskLevel as RiskLevelType } from '../../types/statistics'

interface DistrictListProps {
  floodData: FloodData
}

/**
 * 구별 침수 현황 리스트
 * PRD: 침수 깊이 순 정렬, 최대 침수 깊이, 위험도 뱃지
 */
export function DistrictList({ floodData }: DistrictListProps) {
  const districts = calculateDistrictStatistics(floodData)

  return (
    <section className='district-list' aria-labelledby='district-list-title'>
      <h3 id='district-list-title' className='list-title'>
        구별 침수 현황
      </h3>

      <ul className='district-items' role='list'>
        {districts.map((district) => (
          <DistrictCard key={district.district} data={district} />
        ))}
      </ul>
    </section>
  )
}

/**
 * 개별 구 카드
 */
interface DistrictCardProps {
  data: DistrictStatistics
}

function DistrictCard({ data }: DistrictCardProps) {
  return (
    <li className='district-card'>
      <div className='district-header'>
        <h4 className='district-name'>{data.district}</h4>
        <RiskBadge level={data.riskLevel} />
      </div>

      <div className='district-stats'>
        <div className='stat-row'>
          <span className='stat-label'>최대 침수 깊이</span>
          <span className='stat-value'>
            {data.maxDepth} <span className='unit'>cm</span>
          </span>
        </div>

        <div className='stat-row'>
          <span className='stat-label'>침수 지점</span>
          <span className='stat-value'>
            {data.floodPointCount} <span className='unit'>개</span>
          </span>
        </div>

        <div className='stat-row'>
          <span className='stat-label'>평균 깊이</span>
          <span className='stat-value'>
            {data.averageDepth} <span className='unit'>cm</span>
          </span>
        </div>
      </div>
    </li>
  )
}

/**
 * 위험도 뱃지 (DistrictList 내부 헬퍼)
 */
interface RiskBadgeProps {
  level: RiskLevelType
}

const RISK_CONFIG = {
  [RiskLevel.LOW]: {
    label: '낮음',
    className: 'risk-low',
    color: '#22c55e',
    ariaLabel: '위험도 낮음'
  },
  [RiskLevel.MODERATE]: {
    label: '보통',
    className: 'risk-moderate',
    color: '#f59e0b',
    ariaLabel: '위험도 보통'
  },
  [RiskLevel.SEVERE]: {
    label: '심각',
    className: 'risk-severe',
    color: '#ef4444',
    ariaLabel: '위험도 심각'
  }
} as const

function RiskBadge({ level }: RiskBadgeProps) {
  const config = RISK_CONFIG[level]

  return (
    <span
      className={`risk-badge ${config.className}`}
      style={{ backgroundColor: config.color }}
      aria-label={config.ariaLabel}
      role='status'
    >
      {config.label}
    </span>
  )
}
```

---

## 3. 파일 구조

```
src/
├── components/
│   └── StatisticsPanel/
│       ├── StatisticsPanel.tsx       # 메인 컨테이너 컴포넌트
│       ├── MonthlySummary.tsx        # 월별 요약 (StatCard 헬퍼 포함)
│       ├── DistrictList.tsx          # 구별 리스트 (DistrictCard, RiskBadge 헬퍼 포함)
│       └── styles.css
│
├── types/
│   ├── flood.ts                      # 기존 타입 (FloodData, FloodPolygon 등)
│   └── statistics.ts                 # 통계 타입 (MonthlyStatistics, DistrictStatistics, RiskLevel)
│
├── utils/
│   └── statistics.ts                 # 통계 계산 함수 (calculateMonthlyStatistics, calculateDistrictStatistics)
│
└── mockData/
    └── flood_data_2023_06.json       # 개발용 Mock 데이터
```

**총 3개의 컴포넌트 파일**:

- `StatisticsPanel.tsx` - 메인 컨테이너
- `MonthlySummary.tsx` - 월별 요약 (StatCard 헬퍼 포함)
- `DistrictList.tsx` - 구별 리스트 (DistrictCard, RiskBadge 헬퍼 포함)

---

## 4. 구현 시 고려사항

### 4.1 접근성 (Accessibility)

1. **ARIA 레이블**: 스크린 리더를 위한 적절한 레이블
2. **시맨틱 HTML**: section, h2, h3, ul, li 등 적절한 요소 사용
3. **role 속성**: list, status 등 명시적 역할 정의

### 4.2 데이터 흐름

1. **단방향 데이터 흐름**: Props를 통한 데이터 전달
2. **계산 로직 분리**: 유틸리티 함수로 비즈니스 로직 분리
3. **타입 안전성**: TypeScript 인터페이스로 타입 명시

### 4.3 테스트 전략

1. **단위 테스트**: 통계 계산 함수 테스트
2. **컴포넌트 테스트**: React Testing Library로 렌더링 검증
3. **통합 테스트**: 데이터 변경 시 UI 업데이트 확인

---

## 5. PRD 요구사항 검증

| 요구사항                     | 상태 | 구현 위치                   |
| ---------------------------- | ---- | --------------------------- |
| 침수 발생 자치구 수          | ✅   | MonthlySummary              |
| 총 침수 지점 수              | ✅   | MonthlySummary              |
| 평균 침수 깊이               | ✅   | MonthlySummary              |
| 구별 침수 현황 리스트        | ✅   | DistrictList                |
| 최대 침수 깊이               | ✅   | DistrictCard                |
| 위험도 뱃지 (낮음/보통/심각) | ✅   | RiskBadge                   |
| 침수 깊이 순 정렬            | ✅   | calculateDistrictStatistics |

---

## 6. 향후 최적화 참고사항

### 6.1 성능 최적화 (점진적 적용)

**useMemo를 활용한 메모이제이션**

```typescript
// MonthlySummary.tsx
import { useMemo } from 'react'

export function MonthlySummary({ floodData }: MonthlySummaryProps) {
  const stats = useMemo(() => calculateMonthlyStatistics(floodData), [floodData])
  // ...
}
```

**DistrictList에도 동일하게 적용**

```typescript
// DistrictList.tsx
import { useMemo } from 'react'

export function DistrictList({ floodData }: DistrictListProps) {
  const districts = useMemo(() => calculateDistrictStatistics(floodData), [floodData])
  // ...
}
```

### 6.2 비동기 로딩 (React 19 Suspense)

**PRD 요구사항**: Suspense를 지도/통계 패널/필터 영역 각각 따로 설정

```typescript
// App.tsx
import { Suspense } from 'react'

function App() {
  return (
    <div className='app'>
      {/* 각 영역별로 독립적인 Suspense */}
      <Suspense fallback={<MapSkeleton />}>
        <MapView />
      </Suspense>

      <Suspense fallback={<PanelSkeleton />}>
        <StatisticsPanel floodData={floodData} />
      </Suspense>

      <Suspense fallback={<FilterSkeleton />}>
        <FilterPanel />
      </Suspense>
    </div>
  )
}

// 로딩 스켈레톤
function PanelSkeleton() {
  return (
    <div className='panel-skeleton' aria-busy='true'>
      <div className='skeleton-summary' />
      <div className='skeleton-list' />
    </div>
  )
}
```

### 6.3 기타 최적화

1. **코드 분할**: 필요 시 lazy loading
2. **가상 스크롤**: 구 목록이 많을 경우 react-window 고려
3. **리소스 패턴**: 비동기 데이터 페칭 시 Suspense와 함께 사용

---

## 요약

이 설계 명세서는 다음을 포함합니다:

1. **완전한 데이터 모델**: 월별/구별 통계 및 위험도 분류
2. **컴포넌트 아키텍처**: 모듈화, 접근성 고려
3. **점진적 최적화**: 초기 구현은 단순하게, 필요 시 최적화 적용
4. **확장성**: 향후 기능 추가를 고려한 구조

PRD 요구사항을 충족하면서 점진적으로 개선할 수 있는 유연성을 유지합니다.
