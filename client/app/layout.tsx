import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: '서울시 침수 피해 시뮬레이터',
  description: '지도 기반 침수 피해 시각화 서비스'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='ko'>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
