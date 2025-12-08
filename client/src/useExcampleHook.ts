import { useState } from 'react'

function useExcampleHook() {
  const [count, setCount] = useState<number>(100)

  return {
    count,
    setCount
  }
}

export default useExcampleHook
