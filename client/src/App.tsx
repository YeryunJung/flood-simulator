import { useState } from 'react'
import { useFloodData } from './hooks/useFloodData'
import { StatisticsPanel } from './components/StatisticsPanel/StatisticsPanel'
import './App.css'

function App() {
  const now = new Date()
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const { isLoading, error } = useFloodData(period)

  return (
    <div className='app'>
      <header className='app__header'>
        <form className='period-form'>
          <input
            type='number'
            value={period.year}
            onChange={(e) =>
              setPeriod({
                ...period,
                year: Number(e.target.value)
              })
            }
            placeholder='연도'
            min='2020'
            max='2025'
          />
          <input
            type='number'
            value={period.month}
            onChange={(e) =>
              setPeriod({
                ...period,
                month: Number(e.target.value)
              })
            }
            placeholder='월'
            min='1'
            max='12'
          />
          <button type='submit' disabled={isLoading}>
            {isLoading ? '로딩...' : '조회'}
          </button>
        </form>
        {error && <p className='period-form__error'>{(error as Error).message}</p>}
      </header>
      <div className='app__content'>
        <main className='app__map'>
          <div className='map-placeholder'>
            <span>서울시 지도</span>
            <span className='map-placeholder__sub'>지도 영역</span>
          </div>
        </main>
        <StatisticsPanel period={period} />
      </div>
    </div>
  )
}

export default App
