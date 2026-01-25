/**
 * 침수 깊이 정책
 *
 * - 구간/문구/색상/위험도는 여기서만 정의
 * - 경계 규칙: min 포함, max 미포함
 */

export interface FloodColorConfig {
  fill: string
  stroke: string
  fillOpacity: number
  strokeOpacity: number
}

export type FloodRiskLevel = '안전' | '주의' | '경고' | '위험'

type FloodDepthBand = {
  id: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4'
  min: number
  max: number
  label: string
  description: string
  risk: FloodRiskLevel
  color: FloodColorConfig
}

export const FLOOD_DEPTH_BANDS: readonly FloodDepthBand[] = [
  {
    id: 'LEVEL_1',
    min: 0,
    max: 10,
    label: '0~10cm',
    description: '얕은 침수 (보행 가능)',
    risk: '안전',
    color: {
      fill: '#B3E5FC',
      stroke: '#81D4FA',
      fillOpacity: 0.5,
      strokeOpacity: 0.8,
    },
  },
  {
    id: 'LEVEL_2',
    min: 10,
    max: 30,
    label: '10~30cm',
    description: '보행 불편 (주의)',
    risk: '주의',
    color: {
      fill: '#4FC3F7',
      stroke: '#29B6F6',
      fillOpacity: 0.55,
      strokeOpacity: 0.85,
    },
  },
  {
    id: 'LEVEL_3',
    min: 30,
    max: 60,
    label: '30~60cm',
    description: '보행 곤란 (위험)',
    risk: '경고',
    color: {
      fill: '#1E88E5',
      stroke: '#1565C0',
      fillOpacity: 0.6,
      strokeOpacity: 0.9,
    },
  },
  {
    id: 'LEVEL_4',
    min: 60,
    max: Number.POSITIVE_INFINITY,
    label: '60cm 이상',
    description: '차량·보행 불가 (고위험)',
    risk: '위험',
    color: {
      fill: '#0D47A1',
      stroke: '#1A237E',
      fillOpacity: 0.65,
      strokeOpacity: 0.95,
    },
  },
] as const

function normalizeDepthCm(depthCm: number): number {
  if (!Number.isFinite(depthCm)) return 0
  return Math.max(0, depthCm)
}

function findFloodBand(depthCm: number): FloodDepthBand {
  const depth = normalizeDepthCm(depthCm)
  return (
    FLOOD_DEPTH_BANDS.find((band) => depth >= band.min && depth < band.max) ??
    FLOOD_DEPTH_BANDS[FLOOD_DEPTH_BANDS.length - 1]
  )
}

export function getFloodColor(depthCm: number): FloodColorConfig {
  return findFloodBand(depthCm).color
}

export function getFloodRiskLevel(depthCm: number): FloodRiskLevel {
  return findFloodBand(depthCm).risk
}

export function getFloodLegend(): Array<{
  color: string
  label: string
  description: string
}> {
  return FLOOD_DEPTH_BANDS.map((band) => ({
    color: band.color.fill,
    label: band.label,
    description: band.description,
  }))
}
