import { useQueryClient } from '@tanstack/react-query'
import { StatisticsPanel } from './components/StatisticsPanel/StatisticsPanel'
import { FloodMap } from './components/FloodMap/FloodMap'
import { ErrorBoundary } from './components/ErrorBoundary'
import usePeriodStore from './stores/period'
import './App.css'

function App() {
  const { period, setPeriod } = usePeriodStore()

  const queryClient = useQueryClient()
  const handleReset = () => {
    queryClient.invalidateQueries()
  }

  return (
    <div className='app'>
      <header className='app__header'>
        <form className='period-form'>
          <input
            type='number'
            value={period.year}
            onChange={(e) => setPeriod(Number(e.target.value), period.month)}
            placeholder='연도'
            min='2018'
            max='2025'
          />
          <input
            type='number'
            value={period.month}
            onChange={(e) => setPeriod(period.year, Number(e.target.value))}
            placeholder='월'
            min='1'
            max='12'
          />
        </form>
      </header>
      <div className='app__content'>
        <main className='app__map'>
          <ErrorBoundary level="widget" onReset={handleReset}>
            <FloodMap />
          </ErrorBoundary>
        </main>
        <ErrorBoundary level="widget" onReset={handleReset}>
          <StatisticsPanel />
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default App