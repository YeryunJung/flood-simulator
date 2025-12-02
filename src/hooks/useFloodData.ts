import { useQuery } from '@tanstack/react-query'
import type { FloodData } from '../flood'

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

export function useFloodData(period: Period) {
  return useQuery({
    queryKey: ['floodData', period.year, period.month],
    queryFn: () => fetchFloodData(period),
  })
}
