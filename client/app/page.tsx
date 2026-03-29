'use client'
import dynamic from 'next/dynamic'

// TODO(SSR-001): SSR 데이터 fetch 구현 후 dynamic import 제거 필요
const App = dynamic(() => import('@/App'), { ssr: false })

export default function Page() {
  return <App />
}
