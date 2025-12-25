import { Suspense, useDeferredValue, useMemo } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { floodQueryOptions } from '../../api/flood'
import { groupByDistrict, type DistrictGroup } from '../../domain/flood'
import type { MonthlyStatistics } from '../../types/statistics'
import usePeriodStore from '../../stores/period'

/**
 * 월별 통계 계산 (DistrictGroup 기반)
 */
function calculateMonthlyStatistics(districtGroup: DistrictGroup | undefined): MonthlyStatistics {
  if (!districtGroup || districtGroup.size === 0) {
    return {
      districtCount: 0,
      floodPointCount: 0,
      avgDepth: 0,
      maxDepth: 0
    }
  }

  let totalCount = 0
  let totalDepth = 0
  let maxDepth = 0

  districtGroup.forEach((district) => {
    totalCount += district.count
    totalDepth += district.avgDepth * district.count
    maxDepth = Math.max(maxDepth, district.maxDepth)
  })

  return {
    districtCount: districtGroup.size,
    floodPointCount: totalCount,
    avgDepth: Math.floor(totalDepth / totalCount),
    maxDepth
  }
}

/**
 * Skeleton 컴포넌트 (로딩 상태)
 */
function Skeleton() {
  return (
    <section className='monthly-summary monthly-summary--skeleton'>
      <div className='skeleton skeleton--title' />
      <div className='monthly-summary__cards'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='stat-card'>
            <div className='skeleton skeleton--icon' />
            <div className='stat-card__content'>
              <div className='skeleton skeleton--label' />
              <div className='skeleton skeleton--value' />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * 통계 카드 컴포넌트
 */
function StatCard({
  icon,
  label,
  value,
  unit
}: {
  icon: string
  label: string
  value: number | string
  unit?: string
}) {
  return (
    <div className='stat-card'>
      <span className='stat-card__icon'>{icon}</span>
      <div className='stat-card__content'>
        <span className='stat-card__label'>{label}</span>
        <span className='stat-card__value'>
          {value}
          {unit && <span className='stat-card__unit'>{unit}</span>}
        </span>
      </div>
    </div>
  )
}

/**
 * 월별 통계 요약 컴포넌트
 */
export function MonthlySummary() {
  const period = usePeriodStore((store) => store.period)
  const deferredValue = useDeferredValue(period)
  const { year, month } = deferredValue
  const { data: rawData } = useSuspenseQuery({
    ...floodQueryOptions(deferredValue)
  })

  const data = useMemo(() => {
    return groupByDistrict(rawData)
  }, [rawData])

  const stats = useMemo(() => calculateMonthlyStatistics(data), [data])
  const formattedPeriod = `${year}년 ${month}월`

  const isPending = period !== deferredValue

  return (
    <section
      className='monthly-summary'
      style={{
        opacity: isPending ? 0.5 : 1,
        transition: 'opacity 0.2s ease-in-out'
      }}
    >
      <h2 className='monthly-summary__title'>{formattedPeriod} 침수 현황</h2>
      <div className='monthly-summary__cards'>
        <StatCard icon='🏘️' label='침수 자치구' value={stats.districtCount} unit='개' />
        <StatCard icon='📍' label='침수 지점' value={stats.floodPointCount} unit='개' />
        <StatCard icon='📏' label='평균 침수 깊이' value={stats.avgDepth} unit='cm' />
      </div>
    </section>
  )
}

export default function MonthlySummaryLoader() {
  return (
    <Suspense fallback={<Skeleton />}>
      <MonthlySummary />
    </Suspense>
  )
}
