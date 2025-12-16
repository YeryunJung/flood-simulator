import { useEffect, useState } from 'react'
import './App.css'
import type { FloodData } from './flood'
import env from './config/env'

function App() {
  const [floodData, setFloodData] = useState<FloodData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFloodData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `${env.API_END_POINT}/monthly-flood-data/flood_data_2024_06.json`
        )
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        setFloodData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch')
      } finally {
        setLoading(false)
      }
    }

    fetchFloodData()
  }, [])

  return (
    <>
      <h1>Flood Simulator</h1>
      <div className='card'>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {floodData && (
          <div>
            <p>데이터: {floodData.metadata.title}</p>
            <p>폴리곤 수: {floodData.metadata.total_polygons}</p>
          </div>
        )}
      </div>
    </>
  )
}

export default App
