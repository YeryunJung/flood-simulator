import MonthlySummary from './MonthlySummary'
import DistrictList from './DistrictList'
import './styles.css'

export function StatisticsPanel() {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.has('__dev_statsError')) {
      throw new Error('DEV_STATS_ERROR')
    }
  }

  return (
    <aside className='statistics-panel' data-testid="stats-panel-container">
      <MonthlySummary />
      <DistrictList />
    </aside>
  )
}
