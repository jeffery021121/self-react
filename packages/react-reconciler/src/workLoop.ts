import { beginWork } from './beginWork'
import { commitMutationEffects } from './commitWork'
import { completeWork } from './completeWork'
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber'
import { MutationMask, NoFlags } from './fiberFlags'
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
        workInProgress = null
      }
    }
  } while (true)

  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork

  // wip fiberNode树和树中的flags实现dom操作，更新ui，即进入commit阶段
  commitRoot(root)
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork
  if (finishedWork === null) {
    return
  }
  if (__DEV__) {
    console.warn('commit阶段开始', finishedWork, finishedWork.subtreeFlags)
  }
  root.finishedWork = null

  // 判断是否存在3个子阶段需要执行的操作
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags

  if (subtreeHasEffects || rootHasEffect) {
    // beforeMutation
    // mutation 处理MutationMask相关的flags
    commitMutationEffects(finishedWork)
    root.current = finishedWork // 双缓冲

    // layout
  } else {
    root.current = finishedWork // 双缓冲
  }
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(wip: FiberNode) {
  const next = beginWork(wip)
  // NOTE: beginWork流程结束以后，wip的memoizedProps被赋值成pendingProps，为什么在此时赋值？
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
