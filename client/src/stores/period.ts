import { create } from 'zustand'

interface PeriodStore {
  period: {
    year: number
    month: number
  }
  setPeriod: (year: number, month: number) => void
}

const getInitialPeriod = () => {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

const usePeriodStore = create<PeriodStore>((set) => ({
  period: getInitialPeriod(),
  setPeriod: (year: number, month: number) => set(() => ({ period: { year, month } }))
}))

export default usePeriodStore
