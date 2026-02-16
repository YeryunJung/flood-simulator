# SP-002 트러블슈팅: DistrictCard, StatCard 리렌더링 최적화

## 문제 요약

| 항목 | 내용 |
|------|------|
| **증상** | `period` 변경 시 `DistrictCard` 컴포넌트가 불필요하게 여러 번 리렌더링 |
| **최초 상태** | 3회 리렌더링 |
| **1차 최적화 후** | 2회 리렌더링 |
| **최종 상태** | 1회 리렌더링 |

---

## 핵심 개념: 세 가지 메커니즘의 상호작용

이번 최적화는 **useDeferredValue**, **useSuspenseQuery**, **React.memo**의 동작 원리를 이해해야 해결할 수 있었습니다.

### 1. useDeferredValue의 2단계 렌더링

```
value 변경 시 React의 동작:
│
├─ 1차 렌더링 (즉시)
│   └─ deferredValue: 이전 값 유지 (stale)
│
└─ 2차 렌더링 (백그라운드)
    └─ deferredValue: 새 값으로 동기화
```

**핵심**: `useDeferredValue`는 설계상 **최소 2번의 렌더링**을 유발합니다.
- 1차: UI 응답성 유지 (이전 데이터로 즉시 렌더)
- 2차: 새 데이터 반영 (백그라운드에서 처리)

### 2. useSuspenseQuery의 Structural Sharing

```typescript
// React Query 기본 동작
const { data } = useSuspenseQuery({
  queryKey: ['data', period],
  queryFn: fetchData,
})
```

**Structural Sharing이란?**
- 새 데이터와 이전 데이터를 비교하여 **변경되지 않은 부분의 참조를 유지**
- JSON 호환 값에서만 작동
- 목적: 불필요한 리렌더링 방지

**주의: `select` 옵션 사용 시**
```typescript
// ❌ Structural Sharing 우회됨
const { data } = useSuspenseQuery({
  ...options,
  select: transformFn  // 매번 새 참조 반환 가능
})
```

`select` 함수가 새 객체/배열을 반환하면 Structural Sharing의 이점이 사라집니다.

### 3. React.memo의 얕은 비교

```typescript
// props가 동일하면 리렌더링 스킵
const Component = memo(function Component({ data }) {
  return <div>{data.value}</div>
})
```

**동작 조건**:
- props의 **참조 동일성**(referential identity) 비교
- 참조가 같으면 → 리렌더링 스킵
- 참조가 다르면 → 리렌더링 실행

---

## 문제 분석

### 최초 코드 (3회 리렌더링)

```typescript
export function DistrictList() {
  const period = usePeriodStore((store) => store.period)
  const deferredPeriod = useDeferredValue(period)

  const { data } = useSuspenseQuery({
    ...floodQueryOptions(deferredPeriod),
    select: groupByDistrict  // ⚠️ 문제 1: 매번 새 참조
  })

  const districts = calculateDistrictStatistics(data)  // ⚠️ 문제 2: 매번 새 배열

  return (
    <ul>
      {districts.map((d) => (
        <DistrictCard district={d} />  // ⚠️ 문제 3: memo 없음
      ))}
    </ul>
  )
}
```

**리렌더링 흐름**:
```
period 변경
├─ 1차: period 변경 감지 → DistrictCard 렌더링
├─ 2차: deferredPeriod 동기화 → select 실행 → DistrictCard 렌더링 (* background 실행)
└─ 3차: 최종 커밋 → DistrictCard 렌더링 
```

### 1차 최적화 (2회 리렌더링)

```typescript
export function DistrictList() {
  const period = usePeriodStore((store) => store.period)
  const deferredPeriod = useDeferredValue(period)

  const { data: rawData } = useSuspenseQuery({
    ...floodQueryOptions(deferredPeriod),
    // select 제거 → Structural Sharing 정상 작동
  })

  // useMemo로 참조 안정성 확보
  const data = useMemo(() => groupByDistrict(rawData), [rawData])
  const districts = useMemo(() => calculateDistrictStatistics(data), [data])

  return (
    <ul>
      {districts.map((d) => (
        <DistrictCard district={d} />  // 여전히 memo 없음
      ))}
    </ul>
  )
}
```

**개선 효과**:
- `select` 제거 → Structural Sharing 복원
- `useMemo` 체인 → 데이터 참조 안정화

**남은 문제**:
- `DistrictCard`에 `memo` 없음 → 부모 렌더링 시 무조건 리렌더링

### 최종 최적화 (1회 리렌더링)

```typescript
// memo로 props 동일 시 리렌더링 스킵
const DistrictCard = memo(function DistrictCard({ district }) {
  // ...
})

export function DistrictList() {
  const period = usePeriodStore((store) => store.period)
  const deferredPeriod = useDeferredValue(period)

  const { data: rawData } = useSuspenseQuery({
    ...floodQueryOptions(deferredPeriod),
  })

  const data = useMemo(() => groupByDistrict(rawData), [rawData])
  const districts = useMemo(() => calculateDistrictStatistics(data), [data])

  // ...
}
```

---

## 최종 렌더링 흐름

```
period 변경 (2025/1 → 2025/2)
│
├─ 1차 렌더링 (즉시)
│   ├─ period: 새 값
│   ├─ deferredPeriod: 이전 값 (지연)
│   ├─ rawData: 캐시 히트 (이전 데이터)
│   ├─ districts: useMemo 캐시 히트 (동일 참조)
│   └─ DistrictCard: memo → props 동일 → ✗ 스킵!
│
└─ 2차 렌더링 (백그라운드)
    ├─ deferredPeriod: 동기화됨
    ├─ rawData: 새 데이터 fetch
    ├─ districts: useMemo 재계산 (새 참조)
    └─ DistrictCard: memo → props 변경 → ✓ 렌더링
```

---

## 핵심 교훈

### 1. useDeferredValue는 2회 렌더링이 기본

UI 응답성을 위해 설계된 동작입니다. 이를 1회로 줄이려면 하위 컴포넌트에서 **불필요한 렌더링을 스킵**해야 합니다.

### 2. select 옵션은 Structural Sharing을 우회

`select`가 새 객체를 반환하면 React Query의 참조 최적화가 무력화됩니다.

```typescript
// ❌ 피해야 할 패턴
select: (data) => data.map(transform)  // 매번 새 배열

// ✅ 권장 패턴
const data = useMemo(() => rawData.map(transform), [rawData])
```

### 3. useMemo + memo = 완전한 최적화

| 역할 | 도구 | 효과 |
|------|------|------|
| 값의 참조 안정화 | `useMemo` | 의존성 불변 시 동일 참조 반환 |
| 렌더링 스킵 | `memo` | props 불변 시 리렌더링 방지 |

둘은 **상호보완적**입니다:
- `useMemo`만으로는 부모 렌더링을 막을 수 없음
- `memo`만으로는 매번 새 참조가 전달되면 무용지물

---

## 레퍼런스
- https://ko.react.dev/reference/react/useDeferredValue#how-does-deferring-a-value-work-under-the-hood


## 관련 커밋

- `[SP-002] period 변경 시 지연 렌더링`
- `[SP-002] 월별 통계 계산 함수 호출 횟수 개선`
- `[SP-002] StatCard 컴포넌트 리렌더링 최적화`