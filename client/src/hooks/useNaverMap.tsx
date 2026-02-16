/**
 * 네이버 지도 초기화 및 관리 훅
 *
 * - 스크립트 동적 로딩 및 인증 처리
 * - 지도 인스턴스 생성/정리
 */
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import env from '../config/env'

interface UseNaverMapOptions {
  center?: { lat: number; lng: number }
  zoom?: number
}

interface UseNaverMapReturn {
  mapRef: React.RefObject<HTMLDivElement | null>
  map: naver.maps.Map | null
  isLoaded: boolean
  error: Error | null
}

const NAVER_MAP_SCRIPT_ID = 'naver-map-script'
const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }

type NaverWindow = Window & { navermap_authFailure?: () => void }

export function useNaverMap(options: UseNaverMapOptions = {}): UseNaverMapReturn {
  const { center = SEOUL_CENTER, zoom = 14 } = options

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<naver.maps.Map | null>(null)

  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const cleanupMap = useEffectEvent(() => {
    const mapInstance = mapInstanceRef.current
    if (!mapInstance) return

    try {
      mapInstance.destroy()
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('naver map destroy failed', err)
      }
    }

    mapInstanceRef.current = null
    setIsLoaded(false)
  })

  const authFailureHandler = useEffectEvent(() => {
    setError(new Error('네이버 지도 API 인증에 실패했습니다. API 키/도메인을 확인하세요.'))
  })

  const initializeMap = useEffectEvent(() => {
    if (!mapRef.current || !window.naver?.maps) return

    if (mapInstanceRef.current) {
      setIsLoaded(true)
      return
    }

    try {
      const mapOptions: naver.maps.MapOptions = {
        center: new window.naver.maps.LatLng(center.lat, center.lng),
        zoom,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
        mapTypeControl: false,
        scaleControl: true,
        logoControl: true,
        mapDataControl: false,
      }

      const newMap = new window.naver.maps.Map(mapRef.current, mapOptions)
      mapInstanceRef.current = newMap
      setIsLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('지도 초기화에 실패했습니다.'))
    }
  })

  const handleScriptError = useEffectEvent(() => {
    setError(new Error('네이버 지도 스크립트 로딩에 실패했습니다.'))
  })

  // 스크립트 로딩 및 지도 초기화
  useEffect(() => {
    if (import.meta.env.DEV) {
      const params = new URLSearchParams(window.location.search)
      if (params.has('__dev_mapError')) {
        setError(new Error('DEV_MAP_ERROR'))
        setIsLoaded(false)
        return
      }
    }

    setError(null)

    const clientId = env.NAVER_MAPS_CLIENT_ID
    if (!clientId) {
      setError(new Error('네이버 지도 API 키가 설정되지 않았습니다.'))
      return
    }

    const navWindow = window as NaverWindow
    navWindow.navermap_authFailure = authFailureHandler

    let loadTarget: HTMLScriptElement | null = null

    if (window.naver?.maps) {
      initializeMap()
    }

    const existingScript = document.getElementById(NAVER_MAP_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript && !window.naver?.maps) {
      loadTarget = existingScript
      existingScript.addEventListener('load', initializeMap)
      existingScript.addEventListener('error', handleScriptError)
    }

    if (!window.naver?.maps && !existingScript) {
      const script = document.createElement('script')
      script.id = NAVER_MAP_SCRIPT_ID
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`
      script.async = true

      script.addEventListener('load', initializeMap)
      script.addEventListener('error', handleScriptError)

      document.head.appendChild(script)
      loadTarget = script
    }

    return () => {
      if (loadTarget) {
        loadTarget.removeEventListener('load', initializeMap)
        loadTarget.removeEventListener('error', handleScriptError)
      }
      cleanupMap()
      if (navWindow.navermap_authFailure === authFailureHandler) {
        delete navWindow.navermap_authFailure
      }
    }
  }, [env.NAVER_MAPS_CLIENT_ID])

  // center/zoom 변경 시 기존 맵에 반영
  useEffect(() => {
    const mapInstance = mapInstanceRef.current
    if (!mapInstance || !window.naver?.maps) return
    mapInstance.setCenter(new window.naver.maps.LatLng(center.lat, center.lng))
    mapInstance.setZoom(zoom)
  }, [isLoaded, center.lat, center.lng, zoom])

  return { mapRef, map: mapInstanceRef.current, isLoaded, error }
}
