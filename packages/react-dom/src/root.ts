import {
  createContainer,
  updateContainer,
} from 'react-reconciler/src/fiberReconciler'
import { Container } from 'hostConfig'
import { ReactElement } from 'shared/ReactTypes'
import { initEvent } from './SyntheticEvent'

// ReactDom.createRoot(rootDom).render(<App/>)
export function createRoot(container: Container) {
  const root = createContainer(container)
  return {
    render(element: ReactElement) {
      initEvent(container, 'click')
      return updateContainer(element, root)
    },
  }
}
