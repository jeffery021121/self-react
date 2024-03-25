import React, { useState, Fragment } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [num, setNum] = useState(100)

  return (
    <ul
      onClick={() => {
        setNum(num => num + 1)
        setNum(num => num + 1)
        setNum(num => num + 1)
        let node = document.getElementsByTagName('ul')[0]
        console.log('sync', node.innerText)
        Promise.resolve().then(() => {
          console.log('microTask:', node.innerText)
        })
        setTimeout(() => {
          console.log('task:', node.innerText)
        })
      }}>
      {num}
    </ul>
  )
}
function Child() {
  const arr = [<li>c</li>, <li>d</li>]
  return (
    <div>
      <span>reactDemo</span>
    </div>
  )
}
ReactDOM.createRoot(document.getElementById('root')!).render((<App />) as any)
let aa = (
  <div>
    <p>1</p>
    <p>2</p>
  </div>
)
