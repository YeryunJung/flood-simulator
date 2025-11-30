import { useEffect, useState } from 'react'
import './App.css'
import type { FloodData } from './flood'
import { MonthlySummary } from './components/StatisticsPanel/MonthlySummary'
import { DistrictList } from './components/StatisticsPanel/DistrictList'

function App() {
  const [floodData, setFloodData] = useState<FloodData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/flood_data_2023_07.json')
        const data = await res.json()
        setFloodData(data)
      } catch (e) {
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div>로딩 중...</div>
  if (error) return <div>에러 발생: {error.message}</div>
  if (!floodData) return null

  return (
    <div>
      <MonthlySummary floodData={floodData} />
      <DistrictList floodData={floodData} />
    </div>
  )
}

export default App
