import { useEffect, useState } from 'react'
import type { FloodData } from './flood'
import { StatisticsPanel } from './components/StatisticsPanel/StatisticsPanel'
import './App.css'

function App() {
  const now = new Date()
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [floodData, setFloodData] = useState<FloodData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const { year, month } = period
      const monthStr = String(month).padStart(2, '0')
      const res = await fetch(`/monthly-flood-data/flood_data_${year}_${monthStr}.json`)

      if (!res.ok) throw new Error(`데이터를 찾을 수 없습니다: ${year}년 ${month}월`)
      const data = await res.json()
      setFloodData(data)
    } catch (e) {
      setError(e as Error)
      setFloodData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchData()
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className='app'>
      <header className='app__header'>
        <form className='period-form' onSubmit={handleSubmit}>
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
          <button type='submit' disabled={loading}>
            {loading ? '로딩...' : '조회'}
          </button>
        </form>
        {error && <p className='period-form__error'>{error.message}</p>}
      </header>
      <div className='app__content'>
        <main className='app__map'>
          <div className='map-placeholder'>
            <span>서울시 지도</span>
            <span className='map-placeholder__sub'>지도 영역</span>
          </div>
        </main>
        {floodData && <StatisticsPanel floodData={floodData} />}
      </div>
    </div>
  )
}

export default App
