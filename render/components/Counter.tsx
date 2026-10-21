import { createSignal } from 'solid-js'

export default function Counter() {
  const [count, setCount] = createSignal(0)

  return (
    <button type="button" onClick={() => setCount(count() + 1)}>
      count is
      {' '}
      {count()}
    </button>
  )
}
