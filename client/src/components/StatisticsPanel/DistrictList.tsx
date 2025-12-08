import { Suspense } from 'react'
import { useFloodData, type DistrictGroup } from '../../hooks/useFloodData'
import type { DistrictStatistics, RiskLevel } from '../../types/statistics'
import { RISK_LEVEL } from '../../types/statistics'
import usePeriodStore from '../../stores/period'

interface Period {
  year: number
  month: number
}

interface DistrictListProps {
  period: Period
}

const RISK_CONFIG = {
  [RISK_LEVEL.LOW]: { label: '낮음', color: 'green', order: 0 },
  [RISK_LEVEL.MODERATE]: { label: '보통', color: 'orange', order: 1 },
  [RISK_LEVEL.SEVERE]: { label: '심각', color: 'red', order: 2 }
} as const

function depthToScore(depthM: number): number {
  if (depthM < 0.3) return 1 // 경미
  if (depthM < 1.0) return 2 // 주의
  if (depthM < 2.0) return 3 // 위험
  return 4 // 심각
}

function densityToScore(densityPerKm2: number): number {
  // densityPerKm2 = count / totalAreaKm2
  if (densityPerKm2 < 500) return 1
  if (densityPerKm2 < 1000) return 2
  if (densityPerKm2 < 2000) return 3
  return 4
}

function calculateRiskLevel(
  count: number,
  totalAreaKm2: number, // <-- 이미 km² 단위
  avgDepthM: number,
  maxDepthM: number
): RiskLevel {
  // 1) 밀도 계산 (개/km²)
  const densityPerKm2 = totalAreaKm2 > 0 ? count / totalAreaKm2 : 0

  // 2) 점수 변환
  const densityScore = densityToScore(densityPerKm2)
  const avgDepthScore = depthToScore(avgDepthM)
  const maxDepthScore = depthToScore(maxDepthM)

  // 3) 최종 심각도 지수
  const score = 0.4 * avgDepthScore + 0.3 * maxDepthScore + 0.3 * densityScore

  // 4) 지수 → 3단계 심각도
  if (score < 1.8) return RISK_LEVEL.LOW
  if (score < 2.6) return RISK_LEVEL.MODERATE
  return RISK_LEVEL.SEVERE
}

/**
 * 구별 통계 계산 (DistrictGroup 기반)
 */
function calculateDistrictStatistics(
  districtGroup: DistrictGroup | undefined
): DistrictStatistics[] {
  if (!districtGroup || districtGroup.size === 0) {
    return []
  }

  return Array.from(districtGroup.entries())
    .map(([name, stats]) => ({
      name,
      floodPointCount: stats.count,
      maxDepth: stats.maxDepth,
      avgDepth: stats.avgDepth,
      area: stats.areaKm2,
      riskLevel: calculateRiskLevel(stats.count, stats.areaKm2, stats.avgDepth, stats.maxDepth)
    }))
    .sort((a, b) => RISK_CONFIG[b.riskLevel].order - RISK_CONFIG[a.riskLevel].order)
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = RISK_CONFIG[level]
  return <span className={`risk-badge risk-badge--${config.color}`}>{config.label}</span>
}

function DistrictCard({ district }: { district: DistrictStatistics }) {
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
}

export function DistrictList() {
  const period = usePeriodStore((store) => store.period)
  const { data } = useFloodData(period)
  const districts = calculateDistrictStatistics(data)

  return (
    <section className='district-list'>
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

export default function DistrictListLoader() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DistrictList />
    </Suspense>
  )
}
