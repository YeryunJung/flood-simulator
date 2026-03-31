import { useApiErrorOverlay } from '../../hooks/useApiErrorOverlay'
import './ApiErrorOverlay.css'

interface ApiErrorOverlayProps {
  onRetry?: () => void
  onErrorCleared?: () => void
}

export function ApiErrorOverlay({ onRetry, onErrorCleared }: ApiErrorOverlayProps) {
  const { hasApiError, isNetwork, canRetry, errorMessage } = useApiErrorOverlay({ onErrorCleared })

  if (!hasApiError) return null

  return (
    <div className="api-error-overlay" data-testid="api-error-overlay">
      <div className="api-error-overlay__card" role="alert">
        <span className="api-error-overlay__icon" data-testid="api-error-overlay-icon">
          {isNetwork ? '📡' : '⚠️'}
        </span>
        <h3 className="api-error-overlay__title">
          {isNetwork ? '네트워크 오류' : '서버 오류'}
        </h3>
        <p className="api-error-overlay__message" data-testid="api-error-overlay-message">
          {errorMessage}
        </p>
        {canRetry && onRetry && (
          <button
            className="api-error-overlay__retry"
            data-testid="api-error-overlay-retry-btn"
            onClick={onRetry}
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  )
}
