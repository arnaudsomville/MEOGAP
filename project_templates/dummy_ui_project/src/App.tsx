import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <h1>dummy_ui_project</h1>
      <p>Clicked {count} times</p>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Increment
      </button>
    </main>
  )
}
