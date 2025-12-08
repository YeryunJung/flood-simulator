/// <reference types="vite/client" />

declare global {
    interface Window {
        naver: typeof naver
        navermap_authFailure?: () => void
    }
}
