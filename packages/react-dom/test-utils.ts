import { ReactElement } from 'shared/ReactTypes'
import ReactDom from 'react-dom'

export function renderIntoDocument(element: ReactElement) {
  const div = document.createElement('div')
  return ReactDom.createRoot(div).render(element)
}
