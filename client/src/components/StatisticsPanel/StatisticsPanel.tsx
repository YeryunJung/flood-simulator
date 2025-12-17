import MonthlySummary from './MonthlySummary'
import DistrictList from './DistrictList'
import './styles.css'

export function StatisticsPanel() {
  return (
    <aside className='statistics-panel'>
      <MonthlySummary />
      <DistrictList />
    </aside>
  )
}
