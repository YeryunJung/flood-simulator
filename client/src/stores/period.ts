import { create } from 'zustand'

interface PeriodStore {
  period: {
    year: number
    month: number
  }
  setPeriod: (year: number, month: number) => void
}

const getInitialPeriod = () => {
  return { year: 2023, month: 8 } // 침수 데이터가 있는 2023년 8월을 기본값으로 설정
}

const usePeriodStore = create<PeriodStore>((set) => ({
  period: getInitialPeriod(),
  setPeriod: (year: number, month: number) => set(() => ({ period: { year, month } }))
}))

export default usePeriodStore
