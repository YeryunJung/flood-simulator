import './FloodMapSkeleton.css'

export function DataLoadingSkeleton() {
  return (
    <div className="data-loading-overlay">
      <div className="data-loading-content">
        <div className="skeleton-spinner" />
        <span>침수 데이터 로딩 중...</span>
      </div>
    </div>
  )
}