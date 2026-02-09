import { queryOptions } from '@tanstack/react-query'
import type { FloodData } from '../types/flood'
import env from '../config/env'

export interface Period {
  year: number
  month: number
}

export const floodQueryOptions = (period: Period) =>
  queryOptions({
    queryKey: ['floodData', period.year, period.month],
    queryFn: () => fetchFloodData(period)
  })

async function fetchFloodData(period: Period): Promise<FloodData> {
  const { year, month } = period
  const monthStr = String(month).padStart(2, '0')

  const params = new URLSearchParams()
  params.set('year', year.toString())
  params.set('month', monthStr)

  const res = await fetch(`${env.API_END_POINT}/flood-data?${params.toString()}`)

  if (!res.ok) {
    throw new Error(`데이터를 찾을 수 없습니다: ${year}년 ${month}월`)
  }

  return res.json()
}
