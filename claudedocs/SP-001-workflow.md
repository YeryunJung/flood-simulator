# SP-001 통계 패널 구현 워크플로우

## 📋 구현 개요

월별 침수 통계 요약과 구별 침수 현황을 표시하는 우측 사이드바 패널을 구현합니다.

---

## 🎯 Phase 1: 타입 정의 (Foundation)

### 1-1. 통계 타입 정의
**파일**: `src/types/statistics.ts`

**작업**:
- `MonthlyStatistics` 인터페이스 정의
- `DistrictStatistics` 인터페이스 정의
- `RiskLevel` 상수 객체 및 타입 정의
- Export 구조 확인

**검증**:
- TypeScript 컴파일 오류 없음
- enum 대신 const 객체 패턴 사용 확인

---

## ⚙️ Phase 2: 유틸리티 함수 (Business Logic)

### 2-1. 통계 계산 로직
**파일**: `src/utils/statistics.ts`

**작업**:
- `calculateRiskLevel()` 함수 구현
  - 침수 깊이 기준: 0-30cm(낮음), 30-80cm(보통), 80cm+(심각)
- `calculateMonthlyStatistics()` 함수 구현
  - 자치구 수, 침수 지점 수, 평균 깊이, 총 면적, 최대 깊이 계산
- `calculateDistrictStatistics()` 함수 구현
  - 구별 그룹화, 통계 계산, 최대 깊이순 정렬

**검증**:
- 단위 테스트 작성 및 실행 (선택사항)
- Mock 데이터로 함수 동작 확인

---

## 🎨 Phase 3: 컴포넌트 구현 (UI Layer)

### 3-1. MonthlySummary 컴포넌트
**파일**: `src/components/StatisticsPanel/MonthlySummary.tsx`

**작업**:
- `MonthlySummary` 메인 컴포넌트 구현
- `StatCard` 헬퍼 함수 구현 (파일 내부)
- `formatYearMonth()` 헬퍼 함수 구현
- ARIA 레이블 및 접근성 속성 추가

**주의사항**:
- StatCard는 별도 파일 분리 없이 같은 파일에 정의
- 아이콘은 이모지 사용 (🏘️, 📍, 📏)

---

### 3-2. DistrictList 컴포넌트
**파일**: `src/components/StatisticsPanel/DistrictList.tsx`

**작업**:
- `DistrictList` 메인 컴포넌트 구현
- `DistrictCard` 헬퍼 함수 구현 (파일 내부)
- `RiskBadge` 헬퍼 함수 구현 (파일 내부)
- `RISK_CONFIG` 상수 정의 (색상, 레이블, ARIA)
- 리스트 렌더링 및 접근성 속성 추가

**주의사항**:
- DistrictCard, RiskBadge는 별도 파일 분리 없이 같은 파일에 정의
- 위험도별 색상: 낮음(green), 보통(orange), 심각(red)

---

### 3-3. StatisticsPanel 메인 컴포넌트
**파일**: `src/components/StatisticsPanel/StatisticsPanel.tsx`

**작업**:
- `StatisticsPanel` 컨테이너 컴포넌트 구현
- MonthlySummary, DistrictList import 및 조합
- Props 인터페이스 정의 (floodData, width)
- aside 요소로 시맨틱 마크업

**주의사항**:
- 기본 너비 400px 설정
- ARIA label 추가

---

## 🎨 Phase 4: 스타일링 (Visual Design)

### 4-1. CSS 작성
**파일**: `src/components/StatisticsPanel/styles.css`

**작업**:
- `.statistics-panel` 레이아웃 스타일
- `.monthly-summary` 섹션 스타일
- `.stat-card` 카드 디자인
- `.district-list` 리스트 스타일
- `.district-card` 카드 디자인
- `.risk-badge` 뱃지 스타일 (색상별)
- 반응형 고려 (선택사항)

**주의사항**:
- 일관된 간격, 타이포그래피
- 위험도 뱃지 색상 명확히 구분

---

## 🔌 Phase 5: 통합 및 검증 (Integration)

### 5-1. Mock 데이터 확인
**파일**: `src/mockData/flood_data_2023_06.json`

**작업**:
- Mock 데이터 구조 확인
- FloodData 타입과 호환성 검증

---

### 5-2. 컴포넌트 통합 테스트
**작업**:
- StatisticsPanel에 Mock 데이터 전달
- 브라우저에서 렌더링 확인
- 통계 계산 결과 검증 (수동)
- 위험도 뱃지 색상 표시 확인

**검증 포인트**:
- 월별 요약 3개 통계 카드 표시
- 구별 리스트 최대 침수 깊이순 정렬
- 위험도 뱃지 올바른 색상 표시
- 접근성 검사 (스크린 리더 호환성)

---

## 📦 최종 파일 구조

```
src/
├── types/
│   └── statistics.ts              # Phase 1
├── utils/
│   └── statistics.ts              # Phase 2
├── components/
│   └── StatisticsPanel/
│       ├── StatisticsPanel.tsx    # Phase 3-3
│       ├── MonthlySummary.tsx     # Phase 3-1
│       ├── DistrictList.tsx       # Phase 3-2
│       └── styles.css             # Phase 4
└── mockData/
    └── flood_data_2023_06.json    # 기존 파일 (Phase 5)
```

---

## ✅ 완료 체크리스트

- [ ] Phase 1: 타입 정의 완료 및 컴파일 확인
- [ ] Phase 2: 유틸리티 함수 구현 및 동작 검증
- [ ] Phase 3-1: MonthlySummary 컴포넌트 구현
- [ ] Phase 3-2: DistrictList 컴포넌트 구현
- [ ] Phase 3-3: StatisticsPanel 메인 컴포넌트 구현
- [ ] Phase 4: 스타일링 적용 및 UI 확인
- [ ] Phase 5: Mock 데이터 통합 및 전체 검증

---

## 🎓 구현 시 핵심 원칙

1. **컴포넌트 응집도**: StatCard, DistrictCard, RiskBadge는 별도 파일 분리 없이 사용하는 컴포넌트 내부에 정의
2. **타입 안전성**: TypeScript 인터페이스로 모든 데이터 구조 명시
3. **접근성**: ARIA 레이블, 시맨틱 HTML 사용
4. **단방향 데이터 흐름**: Props를 통한 데이터 전달, 계산 로직은 유틸리티로 분리
5. **점진적 구현**: Foundation → Logic → UI → Style → Integration 순서 준수

---

## 🔧 선택적 최적화 (향후)

**적용 시점**: 기본 구현 완료 후, 성능 이슈 발견 시

- `useMemo`를 활용한 통계 계산 메모이제이션
- React 19 Suspense를 활용한 비동기 로딩
- 가상 스크롤 (구 목록이 많을 경우)

**현재는 단순 구현 우선, 최적화는 필요 시 적용**
