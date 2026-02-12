import MonthlySummary from './MonthlySummary'
import DistrictList from './DistrictList'
import './styles.css'

export function StatisticsPanel() {
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search)
    if (params.has('statsError')) {
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
