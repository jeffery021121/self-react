import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [num, setNum] = useState(100)
  // window.setNum = setNum
  const arr =
    num % 2
      ? [<li key='1'>1</li>, <li key='2'>2</li>, <li key='3'>3</li>]
      : [<li key='3'>3</li>, <li key='2'>2</li>, <li key='1'>1</li>]
  return (
    <div>
      <ul onClick={() => setNum(num + 1)}>{arr}</ul>
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
