import { useState, useMemo, useDeferredValue } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNaverMap } from '../../hooks/useNaverMap'
import { useFloodClusters } from '../../hooks/useFloodClusters'
import { floodQueryOptions } from '../../api/flood'
import { getFloodLegend } from '../../utils/floodDepthPolicy'
import { DataLoadingSkeleton } from './FloodMapSkeleton'
import usePeriodStore from '../../stores/period'
import './FloodMap.css'

interface FloodMapProps {
  className?: string
  enableClustering?: boolean
  showControls?: boolean // 내부 컨트롤 표시 여부
}

const SEOUL_CENTER = { lat: 37.5512, lng: 126.9882 } // 서울 남산 중심
const AVAILABLE_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function FloodMap({
                           className = '',
                           enableClustering = true,
                           showControls = false,
                         }: FloodMapProps) {
  const { period, setPeriod } = usePeriodStore()
  const deferredPeriod = useDeferredValue(period)
  const [clusteringEnabled, setClusteringEnabled] = useState(enableClustering)
  const legend = useMemo(() => getFloodLegend(), [])

  const { mapRef, map, isLoaded: mapLoaded, error: mapError } = useNaverMap({
    center: SEOUL_CENTER,
    zoom: 13,
  })
  const { data: floodData, isLoading: dataLoading, error: dataError } = useQuery({
    ...floodQueryOptions(deferredPeriod),
    placeholderData: keepPreviousData
  })
  const { currentZoom, isClustered, clusterCount } = useFloodClusters({
    map,
    polygons: floodData?.polygons ?? [],
    clusterZoomThreshold: clusteringEnabled ? 11 : 0,
  })

  const error = mapError || dataError?.message
  if (error) {
    return (
        <div className={`flood-map-container flood-map-error ${className}`}>
          <p>{error}</p>
        </div>
    )
  }

  return (
      <div className={`flood-map-container ${className}`}>
        {!mapLoaded && (
            <div className="flood-map-loading">
              <span>지도 로딩 중...</span>
            </div>
        )}
        {mapLoaded && dataLoading && <DataLoadingSkeleton />}
        <div ref={mapRef} className="flood-map" />

        {showControls && (
          <div className="flood-map-controls">
            <div className="flood-map-filter-group">
              <label className="flood-map-filter-label">연도</label>
              <select
                  value={period.year}
                  onChange={(e) => setPeriod(Number(e.target.value), period.month)}
                  className="flood-map-select"
              >
                {AVAILABLE_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                ))}
              </select>
            </div>
            <div className="flood-map-filter-group">
              <label className="flood-map-filter-label">월</label>
              <select
                  value={period.month}
                  onChange={(e) => setPeriod(period.year, Number(e.target.value))}
                  className="flood-map-select"
              >
                {MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {month}월
                    </option>
                ))}
              </select>
            </div>
            <div className="flood-map-filter-group">
              <label className="flood-map-filter-label">클러스터</label>
              <button
                  onClick={() => setClusteringEnabled(!clusteringEnabled)}
                  className={`flood-map-toggle ${clusteringEnabled ? 'active' : ''}`}
              >
                {clusteringEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}

        {clusteringEnabled && mapLoaded && (
            <div className="flood-map-cluster-info">
              <span>줌: {currentZoom}</span>
              {isClustered ? (
                  <span className="cluster-badge">{clusterCount}개 클러스터</span>
              ) : (
                  <span className="polygon-badge">개별 표시</span>
              )}
            </div>
        )}

        {floodData && floodData.polygons.length > 0 && mapLoaded && !dataLoading && (
            <div className="flood-map-info">
              <span>{floodData.metadata.title}</span>
              <span className="flood-map-info-count">
            {floodData.metadata.total_polygons}개 지역
          </span>
            </div>
        )}

        {floodData && floodData.polygons.length === 0 && mapLoaded && !dataLoading && (
            <div className="flood-map-empty">
              <span>{period.year}년 {period.month}월에는 침수 데이터가 없습니다</span>
            </div>
        )}

        <div className="flood-map-legend">
          <div className="flood-map-legend-title">침수 깊이</div>
          {legend.map((item) => (
              <div key={item.label} className="flood-map-legend-item">
                <span className="flood-map-legend-color" style={{ backgroundColor: item.color }} />
                <span>{item.label} ({item.description})</span>
              </div>
          ))}
        </div>
      </div>
  )
}