import { useState } from 'react'
import { StatisticsPanel } from './components/StatisticsPanel/StatisticsPanel'
import './App.css'

function App() {
  const now = new Date()
  const initialPeriod = { year: now.getFullYear(), month: 12 }
  const [period, setPeriod] = useState(initialPeriod)

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
            min='2018'
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
        </form>
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
