import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber'
import { HostRoot } from './workTags'

let workInProgress: FiberNode | null

function prepareFreshStack(root: FiberRootNode) {
  // 初始化
  workInProgress = createWorkInProgress(root.current, {})
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
  // 调度功能

  const root = markUpdateFromFiberToRoot(fiber)!
  renderRoot(root)
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
  let node = fiber
  while (node.return) {
    node = node.return
  }
  // 此时 node已经是 rootFiber了
  if (node.tag === HostRoot) return node.stateNode as FiberRootNode
  return null
}

function renderRoot(root: FiberRootNode) {
  // 初始化
  prepareFreshStack(root)

  do {
    try {
      workLoop()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn('workLoop发生错误', e)
      }
    }
  } while (true)

  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork

  // wip fiberNode树和树中的flags实现dom操作，更新ui，即进入commit阶段
  // commitRoot(root)
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(wip: FiberNode) {
  const next = beginWork(wip)
  wip.memoizedProps = wip.pendingProps
  if (next === null) {
    completeUnitOfWork(wip)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(wip: FiberNode) {
  // 归并过程中，就不用管子元素了。 因为子元素一定已经处理好了
  // 这里，实例代码实现使用了do...while循环，可以持续查找并完成return。除非其有sibling未处理。
  let node: FiberNode | null = wip
  do {
    completeWork(node)
    const sibling = node.sibling
    if (sibling !== null) {
      workInProgress = sibling
      return
    }
    node = node.return
    workInProgress = node
  } while (node !== null)
}
