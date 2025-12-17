import type { FloodData, FloodPolygon } from '../types/flood'
import { DistrictStatistics, RISK_LEVEL, RiskLevel } from '../types/statistics'

/**
 * 자치구별 그룹 타입
 */
export type DistrictGroup = Map<
  string,
  {
    polygons: FloodPolygon[]
    count: number
    maxDepth: number
    avgDepth: number
    areaKm2: number
  }
>

/**
 * FloodData를 자치구별로 그룹핑하는 순수 함수
 */
export function groupByDistrict(data: FloodData): DistrictGroup {
  const districtGroup = new Map<
    string,
    {
      polygons: FloodPolygon[]
      maxDepth: number
      count: number
      avgDepth: number
      totalDepth: number
      areaKm2: number
    }
  >()

  for (const polygon of data.polygons) {
    const district = polygon.info.district
    const existing = districtGroup.get(district) || {
      polygons: [],
      maxDepth: 0,
      count: 0,
      avgDepth: 0,
      totalDepth: 0
    }

    districtGroup.set(district, {
      polygons: [...existing.polygons, polygon],
      maxDepth: Math.max(existing.maxDepth, polygon.info.depth_cm),
      count: existing.count,
      avgDepth: existing.avgDepth,
      totalDepth: existing.totalDepth + polygon.info.depth_cm,
      areaKm2: polygon.info.area_km2
    })
  }

  districtGroup.forEach((district) => {
    district.count = district.polygons.length
    district.avgDepth = Math.floor(district.totalDepth / district.count)
  })

  return districtGroup
}

export const RISK_CONFIG = {
  [RISK_LEVEL.LOW]: { label: '낮음', color: 'green', order: 0 },
  [RISK_LEVEL.MODERATE]: { label: '보통', color: 'orange', order: 1 },
  [RISK_LEVEL.SEVERE]: { label: '심각', color: 'red', order: 2 }
} as const

export function depthToScore(depthM: number): number {
  if (depthM < 0.3) return 1 // 경미
  if (depthM < 1.0) return 2 // 주의
  if (depthM < 2.0) return 3 // 위험
  return 4 // 심각
}

export function densityToScore(densityPerKm2: number): number {
  // densityPerKm2 = count / totalAreaKm2
  if (densityPerKm2 < 500) return 1
  if (densityPerKm2 < 1000) return 2
  if (densityPerKm2 < 2000) return 3
  return 4
}

export function calculateRiskLevel(
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
export function calculateDistrictStatistics(
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
