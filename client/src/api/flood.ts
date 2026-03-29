import { queryOptions } from '@tanstack/react-query'
import type { FloodData } from '../types/flood'
import { ApiError, NetworkError } from './errors'
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
  // 404, 204, 빈 응답 등 "데이터 없음"을 에러가 아닌 정상 응답으로 처리하기 위한 객체
  const emptyData: FloodData = {
    metadata: {
      title: `${year}년 ${month}월 서울 침수 데이터`,
      year_month: `${year}-${monthStr}`,
      total_polygons: 0,
      coordinate_system: 'WGS84 (EPSG:4326)',
      format: 'lat, lng',
      description: '해당 기간의 침수 데이터가 없습니다',
    },
    polygons: [],
  }

  // TODO(SSR-001): 서버에서도 실제 데이터를 페치하도록 전환 필요
  if (typeof window === 'undefined') {
    return emptyData
  }

  // DEV 전용: ?__dev_networkError, ?__dev_apiError=403, ?__dev_parseError, ?__dev_emptyData 쿼리 파라미터로 에러 시뮬레이션
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.has('__dev_networkError')) {
      throw new NetworkError()
    }
    if (params.has('__dev_apiError')) {
      const statusParam = params.get('__dev_apiError')
      const status = statusParam ? Number(statusParam) : 500
      const safeStatus = Number.isFinite(status) ? status : 500
      throw new ApiError(safeStatus, 'DEV_API_ERROR', `서버 오류: ${safeStatus}`)
    }
    if (params.has('__dev_parseError')) {
      throw new ApiError(502, 'PARSE_ERROR', '서버 응답을 파싱할 수 없습니다')
    }
    if (params.has('__dev_emptyData')) {
      return emptyData
    }
  }

  let res: Response
  try {
    const params = new URLSearchParams()
    params.set('year', year.toString())
    params.set('month', monthStr)
    res = await fetch(`${env.API_END_POINT}/api/flood-data?${params.toString()}`)
  } catch { // fetch 실패 = 네트워크 단절 또는 서버 다운
    throw new NetworkError()
  }

  if (res.status === 204) {
    return emptyData
  }

  if (res.status === 404) {
    const body = await res.json().catch(() => null)
    if (body?.error?.code === 'DATA_NOT_FOUND') {
      return emptyData
    }
    const code = body?.error?.code ?? 'NOT_FOUND'
    const message = body?.error?.message ?? '요청을 처리할 수 없습니다'
    throw new ApiError(404, code, message)
  }

  if (!res.ok) {
    throw new ApiError(res.status, res.statusText, `서버 오류: ${res.status}`)
  }

  try {
    const data = (await res.json()) as Partial<FloodData> | null
    if (!data || !Array.isArray(data.polygons) || data.polygons.length === 0) {
      return {
        ...emptyData,
        metadata: {
          ...emptyData.metadata,
          ...(data?.metadata ?? {}),
        },
        polygons: [],
      }
    }
    return data as FloodData
  } catch {
    throw new ApiError(502, 'PARSE_ERROR', '서버 응답을 파싱할 수 없습니다')
  }
}