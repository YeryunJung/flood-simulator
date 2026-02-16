import { useQueryClient } from '@tanstack/react-query'
import { StatisticsPanel } from './components/StatisticsPanel/StatisticsPanel'
import { FloodMap } from './components/FloodMap/FloodMap'
import { ErrorBoundary, ErrorFallback } from './components/ErrorBoundary'
import { isRetryable } from './api/errors'
import usePeriodStore from './stores/period'
import './App.css'

function StatisticsPanelFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <aside className='statistics-panel' data-testid="stats-fallback-container">
      <div className='statistics-panel__unavailable' data-testid="stats-fallback-message">
        데이터를 불러올 수 없습니다
        <button className="statistics-panel__retry" data-testid="stats-fallback-retry-btn" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    </aside>
  )
}

function App() {
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search)
    if (params.has('__dev_rootError')) {
      throw new Error('DEV_ROOT_ERROR')
    }
  }

  const { period, setPeriod } = usePeriodStore()
  const queryClient = useQueryClient()

  const handleRetry = () => {
    queryClient.invalidateQueries()
  }

  return (
    <div className='app' data-testid="app-container">
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
          <ErrorBoundary
            level="widget"
            fallback={({ error, reset }) => {
              const retry = () => {
                if (isRetryable(error)) {
                  queryClient.invalidateQueries()
                }
                reset()
              }
              return <ErrorFallback error={error} onReset={retry} level="widget" />
            }}
          >
            <FloodMap onRetry={handleRetry} />
          </ErrorBoundary>
        </main>
        <ErrorBoundary
          level="widget"
          resetKeys={[period.year, period.month]}
          fallback={({ error, reset }) => (
            <StatisticsPanelFallback
              onRetry={() => {
                if (isRetryable(error)) {
                  queryClient.invalidateQueries()
                }
                reset()
              }}
            />
          )}
        >
          <StatisticsPanel />
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default App