import type { FloodData } from '../../flood'
import type { DistrictStatistics, RiskLevel } from '../../types/statistics'
import { RISK_LEVEL } from '../../types/statistics'

interface DistrictListProps {
  floodData: FloodData
}

const RISK_CONFIG = {
  [RISK_LEVEL.LOW]: { label: '낮음', color: 'green', order: 0 },
  [RISK_LEVEL.MODERATE]: { label: '보통', color: 'orange', order: 1 },
  [RISK_LEVEL.SEVERE]: { label: '심각', color: 'red', order: 2 }
} as const

/**
 * 침수 밀도(개/km²) 기준 위험도 계산
 * @param count 침수 지점 수
 * @param totalAreaM2 총 침수 면적 (m²)
 */
// function calculateRiskLevel(count: number, totalAreaM2: number): RiskLevel {
//   const areaKm2 = totalAreaM2 / 1_000_000
//   const density = areaKm2 > 0 ? count / areaKm2 : 0

//   if (density < 500) return RISK_LEVEL.LOW
//   if (density < 1000) return RISK_LEVEL.MODERATE
//   return RISK_LEVEL.SEVERE
// }

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
 * 구별 통계 계산 및 최대 깊이순 정렬
 */
// TODO: polygon 좌표 paths 정보 불필요
function calculateDistrictStatistics(floodData: FloodData): DistrictStatistics[] {
  const { polygons } = floodData

  // 자치구별 그룹화
  const districtMap = new Map<
    string,
    { count: number; maxDepth: number; totalDepth: number; areaKm2: number }
  >()

  // polygon 탐색
  for (const polygon of polygons) {
    const { district, depth_cm, area_km2 } = polygon.info
    const current = districtMap.get(district) || {
      count: 0,
      maxDepth: 0,
      totalDepth: 0,
      areaKm2: 0
    }

    current.count += 1
    current.maxDepth = Math.floor(Math.max(current.maxDepth, depth_cm))
    current.totalDepth += depth_cm
    current.areaKm2 = area_km2

    districtMap.set(district, current)
  }

  // DistrictStatistics 배열로 변환 및 최대 깊이순 정렬
  return Array.from(districtMap.entries())
    .map(([name, stats]) => {
      const avgDepth = Math.floor(stats.totalDepth / stats.count)

      return {
        name,
        floodPointCount: stats.count,
        maxDepth: stats.maxDepth,
        avgDepth,
        area: stats.areaKm2,
        riskLevel: calculateRiskLevel(stats.count, stats.areaKm2, avgDepth, stats.maxDepth)
      }
    })
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

export function DistrictList({ floodData }: DistrictListProps) {
  const districts = calculateDistrictStatistics(floodData)

  return (
    <section className='district-list'>
      <h2 className='district-list__title'>자치구별 현황</h2>
      <ul className='district-list__items'>
        {districts.map((district) => (
          <DistrictCard key={district.name} district={district} />
        ))}
      </ul>
    </section>
  )
}
