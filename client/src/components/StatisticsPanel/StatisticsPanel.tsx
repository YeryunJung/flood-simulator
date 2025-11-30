import type { FloodData } from '../../flood'
import { MonthlySummary } from './MonthlySummary'
import { DistrictList } from './DistrictList'
import './styles.css'

interface StatisticsPanelProps {
  floodData: FloodData
}

export function StatisticsPanel({ floodData }: StatisticsPanelProps) {
  return (
    <aside className='statistics-panel'>
      <MonthlySummary floodData={floodData} />
      <DistrictList floodData={floodData} />
    </aside>
  )
}
