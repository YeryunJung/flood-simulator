import { useSuspenseQuery } from '@tanstack/react-query'
import type { FloodData, FloodPolygon } from '../flood'

// 데이터 페칭
interface Period {
  year: number
  month: number
}

async function fetchFloodData(period: Period): Promise<FloodData> {
  const { year, month } = period
  const monthStr = String(month).padStart(2, '0')
  const res = await fetch(`/monthly-flood-data/flood_data_${year}_${monthStr}.json`)

  if (!res.ok) {
    throw new Error(`데이터를 찾을 수 없습니다: ${year}년 ${month}월`)
  }

  return res.json()
}

// 그룹핑 함수
// 자치구별 그룹 타입
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

// 순수 함수
function groupByDistrict(data: FloodData): DistrictGroup {
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

  // Map 형태로 반환
  return districtGroup
}

// 자치구별 포맷 => select 옵션
export function useFloodData(period: Period) {
  return useSuspenseQuery({
    queryKey: ['floodData', period.year, period.month],
    queryFn: () => fetchFloodData(period),
    select: groupByDistrict
  })
}
