import Counter from './components/Counter.tsx'
import viteLogo from '/vite.svg'

export default function App() {
  const hello = import.meta.env.VITE_HELLO
  const modeText = import.meta.env.VITE_MODE_TEXT

  return (
    <div>
      <a href="https://vite.dev" target="_blank" rel="noreferrer">
        <img src={viteLogo} class="logo" alt="Vite logo" />
      </a>
      <h1>Vite + Solid</h1>
      <div class="card">
        <Counter />
      </div>
      <p class="read-the-docs">{hello}</p>
      <p class="read-the-docs">{modeText}</p>
    </div>
  )
}
