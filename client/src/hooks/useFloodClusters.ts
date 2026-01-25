/**
 * 침수 폴리곤 렌더링 및 클러스터링 훅
 *
 * - 줌 레벨 낮음 > 클러스터 마커 표시
 * - 줌 레벨 높음 > 개별 폴리곤 표시
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { FloodPolygon, Coordinate } from '../types/flood'
import { getFloodColor, getFloodRiskLevel } from '../utils/floodDepthPolicy'

function formatFloodDate(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr
  return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`
}

interface Cluster {
  id: number
  center: naver.maps.Coord
  polygons: FloodPolygon[]
  avgDepth: number
  /** 클러스터 내 모든 폴리곤을 감싸는 경계 (클릭 시 줌인 영역) */
  bounds: {
    minLat: number
    minLng: number
    maxLat: number
    maxLng: number
  }
}

interface UseFloodClustersOptions {
  map: naver.maps.Map | null
  polygons: FloodPolygon[]
  clusterZoomThreshold?: number
  clusterGridSizePx?: number
}

interface UseFloodClustersReturn {
  currentZoom: number
  isClustered: boolean
  clusterCount: number
}

function getPolygonCenter(paths: Coordinate[]): { lat: number; lng: number } {
  const sum = paths.reduce(
    (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 }
  )
  return {
    lat: sum.lat / paths.length,
    lng: sum.lng / paths.length,
  }
}

/**
 * 픽셀 그리드 기반 클러스터링
 * 지도를 격자로 나눠서 같은 칸에 있는 폴리곤들을 하나의 클러스터로 묶음
 */
function clusterPolygonsByPixel(
  map: naver.maps.Map,
  polygons: FloodPolygon[],
  zoom: number,
  gridSizePx: number = 80
): Cluster[] {
  const safeGridSizePx = Math.max(1, gridSizePx)
  const projection = map.getProjection()

  type GridCell = {
    polygons: FloodPolygon[]
    sumX: number
    sumY: number
    count: number
    minLat: number
    minLng: number
    maxLat: number
    maxLng: number
  }

  const grid: Map<string, GridCell> = new Map()

  polygons.forEach((polygon) => {
    const center = getPolygonCenter(polygon.paths)
    const coord = new window.naver.maps.LatLng(center.lat, center.lng)
    const worldPoint = projection.fromCoordToPoint(coord)
    const pixelPoint = projection.scaleUp(worldPoint, zoom) as naver.maps.Point

    const gridKey = `${Math.floor(pixelPoint.x / safeGridSizePx)}_${Math.floor(
      pixelPoint.y / safeGridSizePx
    )}`

    if (!grid.has(gridKey)) {
      grid.set(gridKey, {
        polygons: [],
        sumX: 0,
        sumY: 0,
        count: 0,
        minLat: Number.POSITIVE_INFINITY,
        minLng: Number.POSITIVE_INFINITY,
        maxLat: Number.NEGATIVE_INFINITY,
        maxLng: Number.NEGATIVE_INFINITY,
      })
    }

    const cell = grid.get(gridKey)!
    cell.polygons.push(polygon)
    cell.sumX += pixelPoint.x
    cell.sumY += pixelPoint.y
    cell.count += 1
    polygon.paths.forEach(([lat, lng]) => {
      cell.minLat = Math.min(cell.minLat, lat)
      cell.minLng = Math.min(cell.minLng, lng)
      cell.maxLat = Math.max(cell.maxLat, lat)
      cell.maxLng = Math.max(cell.maxLng, lng)
    })
  })

  const clusters: Cluster[] = []
  let clusterId = 0

  grid.forEach((cell) => {
    const avgPixelPoint = new window.naver.maps.Point(
      cell.sumX / cell.count,
      cell.sumY / cell.count
    )
    const avgWorldPoint = projection.scaleDown(avgPixelPoint, zoom) as naver.maps.Point
    const centerCoord = projection.fromPointToCoord(avgWorldPoint)
    const avgDepth =
      cell.polygons.reduce((sum, p) => sum + p.info.depth_cm, 0) / cell.polygons.length

    clusters.push({
      id: clusterId++,
      center: centerCoord,
      polygons: cell.polygons,
      avgDepth,
      bounds: {
        minLat: cell.minLat,
        minLng: cell.minLng,
        maxLat: cell.maxLat,
        maxLng: cell.maxLng,
      },
    })
  })

  return clusters
}

export function useFloodClusters({
  map,
  polygons,
  clusterZoomThreshold = 11,
  clusterGridSizePx = 80,
}: UseFloodClustersOptions): UseFloodClustersReturn {
  const [currentZoom, setCurrentZoom] = useState(11)
  const [isZoomSynced, setIsZoomSynced] = useState(false)

  const clusterMarkersRef = useRef<naver.maps.Marker[]>([])
  const polygonInstancesRef = useRef<naver.maps.Polygon[]>([])
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const mapClickListenerRef = useRef<naver.maps.MapEventListener | null>(null)

  const isClustered = isZoomSynced && currentZoom <= clusterZoomThreshold
  const clusterZoom = isClustered ? currentZoom : null
  const [clusterCount, setClusterCount] = useState(0)

  const clearAll = useCallback(() => {
    clusterMarkersRef.current.forEach((marker) => marker.setMap(null))
    clusterMarkersRef.current = []

    polygonInstancesRef.current.forEach((polygon) => polygon.setMap(null))
    polygonInstancesRef.current = []

    if (infoWindowRef.current) {
      infoWindowRef.current.close()
    }

    if (tooltipRef.current) {
      document.body.removeChild(tooltipRef.current)
      tooltipRef.current = null
    }

    if (mapClickListenerRef.current) {
      window.naver.maps.Event.removeListener(mapClickListenerRef.current)
      mapClickListenerRef.current = null
    }
  }, [])

  const createClusterMarkers = useCallback(
    (clusters: Cluster[]) => {
      if (!map || !window.naver?.maps) return

      clearAll()

      clusters.forEach((cluster) => {
        const colorConfig = getFloodColor(cluster.avgDepth)

        const marker = new window.naver.maps.Marker({
          map,
          position: cluster.center,
          icon: {
            content: `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                background: ${colorConfig.fill};
                border: 3px solid ${colorConfig.stroke};
                border-radius: 50%;
                color: white;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                cursor: pointer;
              ">
                ${cluster.polygons.length}
              </div>
            `,
            anchor: new window.naver.maps.Point(20, 20),
          },
        })

        window.naver.maps.Event.addListener(marker, 'click', () => {
          const bounds = new window.naver.maps.LatLngBounds(
            new window.naver.maps.LatLng(
              cluster.bounds.minLat,
              cluster.bounds.minLng
            ),
            new window.naver.maps.LatLng(
              cluster.bounds.maxLat,
              cluster.bounds.maxLng
            )
          )
          map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
        })

        clusterMarkersRef.current.push(marker)
      })

      setClusterCount(clusters.length)
    },
    [map, clearAll]
  )

  const createIndividualPolygons = useCallback(() => {
    if (!map || !window.naver?.maps) return

    clearAll()

    const infoWindow = new window.naver.maps.InfoWindow({
      content: '',
      borderWidth: 0,
      disableAnchor: true,
      backgroundColor: 'transparent',
      pixelOffset: { x: 0, y: -10 },
    })
    infoWindowRef.current = infoWindow

    const tooltip = document.createElement('div')
    tooltip.style.cssText = `
      position: fixed;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 6px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.15s ease;
      max-width: 200px;
      line-height: 1.4;
      white-space: pre-line;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `
    document.body.appendChild(tooltip)
    tooltipRef.current = tooltip

    polygons.forEach((floodPolygon) => {
      const { paths, info } = floodPolygon
      const colorConfig = getFloodColor(info.depth_cm)

      const naverPaths = paths.map(
        ([lat, lng]) => new window.naver.maps.LatLng(lat, lng)
      )

      const polygon = new window.naver.maps.Polygon({
        map,
        paths: [naverPaths],
        fillColor: colorConfig.fill,
        fillOpacity: colorConfig.fillOpacity,
        strokeColor: colorConfig.stroke,
        strokeOpacity: colorConfig.strokeOpacity,
        strokeWeight: 2,
        clickable: true,
      })

      window.naver.maps.Event.addListener(polygon, 'click', (e: naver.maps.PointerEvent) => {
        const level = getFloodRiskLevel(info.depth_cm)
        const startDate = formatFloodDate(info.start_date)
        const endDate = formatFloodDate(info.end_date)
        const dateRange = startDate === endDate ? startDate : `${startDate} ~ ${endDate}`

        const container = document.createElement('div')
        container.style.cssText = `
          padding: 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          min-width: 200px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `

        const title = document.createElement('div')
        title.style.cssText = `
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        `
        title.textContent = `${info.district} ${info.address}`
        container.appendChild(title)

        const details = document.createElement('div')
        details.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          color: #555;
        `
        container.appendChild(details)

        const addRow = (label: string, value: string, valueColor?: string) => {
          const row = document.createElement('div')
          row.style.cssText = 'display: flex; justify-content: space-between;'

          const labelSpan = document.createElement('span')
          labelSpan.style.cssText = 'color: #888;'
          labelSpan.textContent = label

          const valueSpan = document.createElement('span')
          valueSpan.style.cssText = `font-weight: 500;${valueColor ? ` color: ${valueColor};` : ''}`
          valueSpan.textContent = value

          row.append(labelSpan, valueSpan)
          details.appendChild(row)
        }

        addRow('침수 깊이', `${info.depth_cm.toFixed(1)}cm (${level})`, colorConfig.stroke)
        addRow('침수 면적', `${info.area_km2.toFixed(2)} km²`)
        addRow('발생 기간', dateRange)

        infoWindow.setContent(container)
        infoWindow.open(map, e.coord)
      })

      window.naver.maps.Event.addListener(polygon, 'mouseover', () => {
        const startDate = formatFloodDate(info.start_date)
        const endDate = formatFloodDate(info.end_date)
        const dateRange = startDate === endDate ? startDate : `${startDate} ~ ${endDate}`

        const title = document.createElement('div')
        title.style.cssText = 'font-weight: 600; margin-bottom: 4px;'
        title.textContent = `${info.district} ${info.address}`

        const body = document.createElement('div')
        body.textContent = `깊이: ${info.depth_cm.toFixed(1)}cm\n기간: ${dateRange}`

        tooltip.replaceChildren(title, body)
        tooltip.style.opacity = '1'
      })

      window.naver.maps.Event.addListener(polygon, 'mousemove', (e: naver.maps.PointerEvent) => {
        const mouseEvent = e.pointerEvent as MouseEvent
        tooltip.style.left = `${mouseEvent.clientX + 15}px`
        tooltip.style.top = `${mouseEvent.clientY + 15}px`
      })

      window.naver.maps.Event.addListener(polygon, 'mouseout', () => {
        tooltip.style.opacity = '0'
      })

      polygonInstancesRef.current.push(polygon)
    })

    mapClickListenerRef.current = window.naver.maps.Event.addListener(map, 'click', () => {
      infoWindow.close()
    })

    setClusterCount(0)
  }, [map, polygons, clearAll])

  useEffect(() => {
    if (!map || !window.naver?.maps) {
      setIsZoomSynced(false)
      return
    }

    const syncZoom = () => {
      const zoom = map.getZoom()
      setCurrentZoom(zoom)
      setIsZoomSynced(true)
    }

    const zoomListener = window.naver.maps.Event.addListener(map, 'zoom_changed', syncZoom)
    syncZoom()

    return () => {
      window.naver.maps.Event.removeListener(zoomListener)
    }
  }, [map])

  useEffect(() => {
    if (!map || !window.naver?.maps) return

    if (polygons.length === 0) {
      clearAll()
      setClusterCount(0)
      return
    }

    if (!isZoomSynced) return

    if (isClustered && clusterZoom !== null) {
      const clusters = clusterPolygonsByPixel(map, polygons, clusterZoom, clusterGridSizePx)
      createClusterMarkers(clusters)
    } else {
      createIndividualPolygons()
    }

    return () => {
      clearAll()
    }
  }, [map, polygons, isClustered, isZoomSynced, clusterZoom, clusterGridSizePx])

  return {
    currentZoom,
    isClustered,
    clusterCount,
  }
}
