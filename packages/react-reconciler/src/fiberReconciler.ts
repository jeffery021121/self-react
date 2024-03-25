import { Container } from 'hostConfig'
import { FiberNode, FiberRootNode } from './fiber'
import { HostRoot } from './workTags'
import {
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
} from './updateQueue'
import { ReactElement } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workLoop'
import { requestUpdateLane } from './fiberLanes'
// ReactDom.createRoot(rootElement).render(<App>)

// ReactDom.createRoot(rootElement)时调用
export function createContainer(container: Container) {
  // 创建fiberRoot和rootFiber,初始化update等
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRootFiber)
  hostRootFiber.updateQueue = createUpdateQueue()
  return root
}

// root.render(<App>)时调用，首屏渲染
export function updateContainer(
  element: ReactElement | null,
  root: FiberRootNode,
) {
  const hostRootFiber = root.current
  // 首屏渲染，创建一个 update

  const lane = requestUpdateLane()

  const update = createUpdate<ReactElement | null>(element, lane) // 这里其实比较有疑问，可能是reducer定式导致的，认为这里的action必须是一个状态，或者状态相关函数
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<ReactElement | null>,
    update,
  )
  scheduleUpdateOnFiber(hostRootFiber, lane)
  return element // 这里不太理解，为什么要return element
}
