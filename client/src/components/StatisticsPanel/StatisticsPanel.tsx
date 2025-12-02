import { MonthlySummary } from './MonthlySummary'
import { DistrictList } from './DistrictList'
import './styles.css'

interface Period {
  year: number
  month: number
}

interface StatisticsPanelProps {
  period: Period
}

export function StatisticsPanel({ period }: StatisticsPanelProps) {
  return (
    <aside className='statistics-panel'>
      <MonthlySummary period={period} />
      <DistrictList period={period} />
    </aside>
  )
}
