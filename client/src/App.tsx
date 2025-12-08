import './App.css'
import useExcampleHook from './useExcampleHook'

function App() {
  const { count, setCount } = useExcampleHook()

  return (
    <>
      <h1>Flood Simulator</h1>
      <div className='card'>
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className='read-the-docs'>Click on the Vite and React logos to learn more</p>
    </>
  )
}

export default App
