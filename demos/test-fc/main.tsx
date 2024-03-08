import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [num, setNum] = useState(100)
  // window.setNum = setNum
  return (
    <div>
      <span onClick={() => setNum(num + 1)}>{num}</span>
    </div>
  )
}
function Child() {
  return (
    <div>
      <span>reactDemo</span>
    </div>
  )
}
ReactDOM.createRoot(document.getElementById('root')!).render((<App />) as any)
