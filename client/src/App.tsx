'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { StatisticsPanel } from './components/StatisticsPanel/StatisticsPanel'
import { FloodMap } from './components/FloodMap/FloodMap'
import { ErrorBoundary, ErrorFallback } from './components/ErrorBoundary'
import { ApiErrorOverlay } from './components/ApiErrorOverlay/ApiErrorOverlay'
import { isRetryable, isServerApiError } from './api/errors'
import usePeriodStore from './stores/period'
import './App.css'

function StatisticsPanelFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  if (isServerApiError(error)) {
    return (
      <aside className='statistics-panel' data-testid="stats-api-error-container">
        <div className='statistics-panel__unavailable' data-testid="stats-api-error-placeholder" />
      </aside>
    )
  }

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
  const [retryCount, setRetryCount] = useState(0)

  const handleGlobalRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['floodData'] })
    setRetryCount(c => c + 1)
  }

  const handleErrorCleared = useCallback(() => {
    setRetryCount(c => c + 1)
  }, [])

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
                  queryClient.invalidateQueries({ queryKey: ['floodData'] })
                }
                reset()
              }
              return <ErrorFallback error={error} onReset={retry} level="widget" />
            }}
          >
            <FloodMap />
          </ErrorBoundary>
        </main>
        <ErrorBoundary
          level="widget"
          resetKeys={[period.year, period.month, retryCount]}
          fallback={({ error, reset }) => (
            <StatisticsPanelFallback
              error={error}
              onRetry={() => {
                if (isRetryable(error)) {
                  queryClient.invalidateQueries({ queryKey: ['floodData'] })
                }
                reset()
              }}
            />
          )}
        >
          <StatisticsPanel />
        </ErrorBoundary>
        <ApiErrorOverlay
          onRetry={handleGlobalRetry}
          onErrorCleared={handleErrorCleared}
        />
      </div>
    </div>
  )
}

export default App