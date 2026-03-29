import { useDeferredValue, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { floodQueryOptions } from '../api/flood'
import { isServerApiError, isNetworkError, isRetryable, getUserFriendlyMessage } from '../api/errors'
import usePeriodStore from '../stores/period'

interface UseApiErrorOverlayOptions {
  onErrorCleared?: () => void
}

export function useApiErrorOverlay({ onErrorCleared }: UseApiErrorOverlayOptions = {}) {
  const period = usePeriodStore((s) => s.period)
  const deferredPeriod = useDeferredValue(period)

  // 같은 queryKey를 구독 (추가 페칭 없음)
  const { error } = useQuery(floodQueryOptions(deferredPeriod))
  const apiError = error && isServerApiError(error) ? error : null
  const hasApiError = apiError !== null

  // 에러 -> 정상 전환 감지로 ErrorBoundary가 자동 리셋되지 않는 문제 방지
  const prevHadError = useRef(false)
  useEffect(() => {
    if (prevHadError.current && !hasApiError) {
      onErrorCleared?.()
    }
    prevHadError.current = hasApiError
  }, [hasApiError, onErrorCleared])

  return {
    hasApiError,
    apiError,
    isNetwork: apiError ? isNetworkError(apiError) : false,
    canRetry: apiError ? isRetryable(apiError) : false,
    errorMessage: apiError ? getUserFriendlyMessage(apiError, process.env.NODE_ENV === 'development') : null,
  }
}