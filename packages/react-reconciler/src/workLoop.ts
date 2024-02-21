import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { FiberNode } from './fiber'

let workInProgress: FiberNode | null

function prepareFreshStack(fiber: FiberNode) {
  // 初始化
  workInProgress = fiber
}

function renderRoot(root: FiberNode) {
  // 初始化
  prepareFreshStack(root)

  do {
    try {
      workLoop()
    } catch (e) {}
  } while (true) // 这里的工作循环是永不停止的？
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber)
  fiber.memoizedProps = fiber.pendingProps
  if (next === null) {
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  // 归并过程中，就不用管子元素了。 因为子元素一定已经处理好了
  // 这里没有考虑到持续向上查找return的逻辑，只查找了一层
  // completeWork(fiber)
  // if (fiber.sibling !== null) {
  //   workInProgress = fiber.sibling
  // } else {
  //   workInProgress = fiber.return
  // }

  // 归并过程中，就不用管子元素了。 因为子元素一定已经处理好了
  // 这里，实例代码实现使用了do...while循环，可以持续查找并完成return。除非其有sibling未处理。
  let node: FiberNode | null = fiber
  do {
    completeWork(node)
    const sibling = fiber.sibling
    if (sibling !== null) {
      workInProgress = sibling
      return
    }
    node = node.return
    workInProgress = node
  } while (node !== null)
}
