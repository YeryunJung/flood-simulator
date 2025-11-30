/**
 * 통계 패널 타입 정의
 * SP-001: 월별 침수 통계 및 구별 현황
 */

/**
 * 위험도 레벨 상수 객체
 * enum 대신 const 객체 패턴 사용 (tree-shaking 최적화)
 */
export const RISK_LEVEL = {
  LOW: 'low',
  MODERATE: 'moderate',
  SEVERE: 'severe'
} as const

/**
 * 위험도 레벨 타입
 */
export type RiskLevel = (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL]

/**
 * 월별 통계 요약
 */
export interface MonthlyStatistics {
  /** 침수 발생 자치구 수 */
  districtCount: number

  /** 총 침수 지점 수 */
  floodPointCount: number

  /** 평균 침수 깊이 (cm) */
  avgDepth: number

  /** 최대 침수 깊이 (cm) */
  maxDepth: number
}

/**
 * 자치구별 통계
 */
export interface DistrictStatistics {
  /** 자치구 이름 */
  name: string

  /** 자치구 면적 (km²) */
  area: number

  /** 침수 지점 수 */
  floodPointCount: number

  /** 최대 침수 깊이 (cm) */
  maxDepth: number

  /** 평균 침수 깊이 (cm) */
  avgDepth: number

  /** 위험도 레벨 */
  riskLevel: RiskLevel
}
