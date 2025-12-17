/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_END_POINT: string
  readonly VITE_NAVER_MAPS_CLIENT_ID: string
}

declare global {
    interface Window {
        naver: typeof naver
        navermap_authFailure?: () => void
    }
}
