import React, { useState, Fragment } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [num, setNum] = useState(100)
  // window.setNum = setNum
  const arr =
    num % 2
      ? [<li key='1'>1</li>, <li key='2'>2</li>, <li key='3'>3</li>]
      : [<li key='3'>3</li>, <li key='2'>2</li>, <li key='1'>1</li>]
  // return (
  //   <ul>
  //     <>
  //       <li>1</li>
  //       <li>2</li>
  //     </>
  //     <li>3</li>
  //     <li>4</li>
  //   </ul>
  // )
  // if (num % 2 === 0) {
  //   return (
  //     <div onClick={() => setNum(num + 1)}>
  //       <>
  //         <p>singleFragment1</p>
  //         <p>singleFragment2</p>
  //       </>
  //       <p>1</p>
  //     </div>
  //   )
  // }
  // return (
  //   <div onClick={() => setNum(num + 1)}>
  //     <p>1</p>
  //   </div>
  // )

  return (
    <ul onClick={() => setNum(num + 1)}>
      {arr}

      <li key='4'>4</li>
      <Fragment>
        <div>b</div>
        {!!(num % 2) && <div>a</div>}
      </Fragment>
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
