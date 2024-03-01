import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [num, setNum] = useState(100)
  return <div>{num}</div>
}
function Child() {
  return <span>reactDemo</span>
}
ReactDOM.createRoot(document.getElementById('root')!).render((<App />) as any)
