/**
 * 서울시 침수 데이터 타입 정의
 * 2023-2025 침수 흔적 데이터
 */

/**
 * 좌표 타입 [위도, 경도]
 * WGS84 (EPSG:4326) 좌표계 사용
 */
export type Coordinate = [number, number] // [lat, lng]

/**
 * 침수 지역 상세 정보
 */
export interface FloodInfo {
  /** 지번 주소 (예: "394-21 대") */
  address: string

  /** 자치구 이름 */
  district: string

  /** 침수 깊이 (cm) */
  depth_cm: number

  /** 침수 면적 (m²) */
  area_km2: number

  /** 침수 시작 날짜 (YYYYMMDD 형식) */
  start_date: string

  /** 침수 종료 날짜 (YYYYMMDD 형식) */
  end_date: string
}

/**
 * 개별 침수 폴리곤
 */
export interface FloodPolygon {
  /** 폴리곤 고유 ID (0부터 시작) */
  id: number

  /** 원본 데이터의 ID */
  sgg_oid: number

  /** 폴리곤을 구성하는 좌표 배열 */
  paths: Coordinate[]

  /** 침수 상세 정보 */
  info: FloodInfo
}

/**
 * 월별 침수 데이터 메타데이터
 */
export interface FloodMetadata {
  /** 데이터 제목 */
  title: string

  /** 연월 (YYYY-MM 형식) */
  year_month: string

  /** 총 폴리곤 개수 */
  total_polygons: number

  /** 좌표 체계 */
  coordinate_system: string

  /** 좌표 형식 */
  format: string

  /** 데이터 설명 */
  description: string

  /** 추가 노트 (선택적) */
  note?: string
}

/**
 * 월별 침수 데이터 전체 구조
 */
export interface FloodData {
  /** 메타데이터 */
  metadata: FloodMetadata

  /** 침수 폴리곤 배열 */
  polygons: FloodPolygon[]
}

/**
 * 자치구 목록 (타입)
 */
export type District =
  | '노원구'
  | '영등포구'
  | '성북구'
  | '서초구'
  | '도봉구'
  | '구로구'
  | '동대문구'
  | '마포구'
  | '강남구'
  | '강동구'
