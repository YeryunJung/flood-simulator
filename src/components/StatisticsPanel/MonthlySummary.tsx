import type { FloodData } from '../../flood'
import type { MonthlyStatistics } from '../../types/statistics'

interface MonthlySummaryProps {
  floodData: FloodData
}

/**
 * 월별 통계 계산
 * Phase 2 로직 - 추후 utils/statistics.ts로 분리 예정
 */
function calculateMonthlyStatistics(floodData: FloodData): MonthlyStatistics {
  const { polygons } = floodData

  if (polygons.length === 0) {
    return {
      districtCount: 0,
      floodPointCount: 0,
      avgDepth: 0,
      maxDepth: 0
    }
  }

  const districts = new Set(polygons.map((p) => p.info.district))
  const maxDepth = Math.max(...polygons.map((p) => p.info.depth_cm))
  const avgDepth = Math.floor(
    polygons.map((p) => p.info.depth_cm).reduce((prev, cur) => prev + cur, 0) / polygons.length
  )

  return {
    districtCount: districts.size,
    floodPointCount: polygons.length,
    avgDepth,
    maxDepth
  }
}

/**
 * 연월 포맷팅
 */
function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return `${year}년 ${parseInt(month, 10)}월`
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
export function MonthlySummary({ floodData }: MonthlySummaryProps) {
  const stats = calculateMonthlyStatistics(floodData)
  const formattedPeriod = formatYearMonth(floodData.metadata.year_month)

  return (
    <section className='monthly-summary'>
      <h2 className='monthly-summary__title'>{formattedPeriod} 침수 현황</h2>
      <div className='monthly-summary__cards'>
        <StatCard icon='🏘️' label='침수 자치구' value={stats.districtCount} unit='개' />
        <StatCard icon='📍' label='침수 지점' value={stats.floodPointCount} unit='개' />
        <StatCard icon='📏' label='평균 침수 깊이' value={stats.avgDepth} unit='cm' />
      </div>
    </section>
  )
}
