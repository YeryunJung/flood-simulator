import { memo, Suspense, useDeferredValue, useMemo } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { floodQueryOptions } from '../../api/flood'
import { calculateDistrictStatistics, groupByDistrict, RISK_CONFIG } from '../../domain/flood'
import type { DistrictStatistics, RiskLevel } from '../../types/statistics'
import usePeriodStore from '../../stores/period'

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = RISK_CONFIG[level]
  return <span className={`risk-badge risk-badge--${config.color}`}>{config.label}</span>
}

const DistrictCard = memo(function DistrictCard({ district }: { district: DistrictStatistics }) {
  const density = district.area > 0 ? (district.floodPointCount / district.area).toFixed(4) : '0'

  return (
    <li className='district-card'>
      <div className='district-card__header'>
        <span className='district-card__name'>{district.name}</span>&nbsp;
        <RiskBadge level={district.riskLevel} />
        <span className='district-card__density'>({density} 개/m²)</span>
      </div>
      <div className='district-card__stats'>
        <span>침수 {district.floodPointCount}개</span>
        &nbsp;
        <span>최대 {district.maxDepth}cm</span>
      </div>
    </li>
  )
})

export function DistrictList() {
  const period = usePeriodStore((store) => store.period)
  const deferredPeriod = useDeferredValue(period)

  const { data: rawData } = useSuspenseQuery({
    ...floodQueryOptions(deferredPeriod),
  })

  // 서버 상태 변경 시 데이터 포맷 함수 호출 
  const data = useMemo(() => {
    return groupByDistrict(rawData)
  }, [rawData])

  const districts = useMemo(() => calculateDistrictStatistics(data), [data])

  const isPending = period !== deferredPeriod

  return (
    <section
      className='district-list'
      style={{
        opacity: isPending ? 0.5 : 1,
        transition: 'opacity 0.2s ease-in-out'
      }}
    >
      <h2 className='district-list__title'>자치구별 현황</h2>
      {districts.length ? (
        <ul className='district-list__items'>
          {districts.map((district) => (
            <DistrictCard key={district.name} district={district} />
          ))}
        </ul>
      ) : (
        <span className='empty-list'>표시할 데이터가 없어요</span>
      )}
    </section>
  )
}

export default function DistrictListLoader() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DistrictList />
    </Suspense>
  )
}

function DistrictCardSkeleton() {
  return (
    <li className='district-card district-card--skeleton'>
      <div className='district-card__header'>
        <div className='skeleton skeleton--name' />
        <div className='skeleton skeleton--badge' />
        <div className='skeleton skeleton--density' />
      </div>
      <div className='district-card__stats'>
        <div className='skeleton skeleton--stat' />
        <div className='skeleton skeleton--stat' />
      </div>
    </li>
  )
}

function Skeleton() {
  return (
    <section className='district-list district-list--skeleton'>
      <div className='skeleton skeleton--title' />
      <ul className='district-list__items'>
        {[1, 2, 3, 4].map((i) => (
          <DistrictCardSkeleton key={i} />
        ))}
      </ul>
    </section>
  )
}
