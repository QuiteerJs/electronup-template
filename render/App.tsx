import Counter from './components/Counter.tsx'
import viteLogo from '/vite.svg'

export default function App() {
  const hello = import.meta.env.VITE_HELLO
  const modeText = import.meta.env.VITE_MODE_TEXT

  return (
    <div>
      <a href="https://vite.dev" target="_blank" rel="noreferrer">
        <img src={viteLogo} className="logo" alt="Vite logo" />
      </a>
      <h1>Vite + React</h1>
      <div className="card">
        <Counter />
      </div>
      <p className="read-the-docs">{hello}</p>
      <p className="read-the-docs">{modeText}</p>
    </div>
  )
}
