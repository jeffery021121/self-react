import { scheduleMicroTask } from 'hostConfig'
import { beginWork } from './beginWork'
import { commitMutationEffects } from './commitWork'
import { completeWork } from './completeWork'
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber'
import { MutationMask, NoFlags } from './fiberFlags'
import {
  Lane,
  NoLane,
  SyncLane,
  getHighestPriorityLane,
  markRootFinished,
  mergeLanes,
} from './fiberLanes'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'
import { HostRoot } from './workTags'

let workInProgress: FiberNode | null
let wipRenderLane: Lane = NoLane

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  // 初始化
  wipRenderLane = lane
  workInProgress = createWorkInProgress(root.current, {})
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
  // 调度功能

  const root = markUpdateFromFiberToRoot(fiber)!
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root)
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes)
  if (updateLane === NoLane) {
    return
  }
  if (updateLane === SyncLane) {
    // 同步优先级，用微任务调度
    if (__DEV__) {
      console.log('在微任务中调度，优先级：', updateLane)
    }
    // 将任务添加到 syncQueue
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))

    // 使用宿主环境的微任务，执行 syncQueue内的任务
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // 其他优先级，用宏任务调度
  }
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

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
  const nextLanes = getHighestPriorityLane(root.pendingLanes)
  if (nextLanes !== SyncLane) {
    // 其他比SyncLane优先级低的情况
    // NoLane
    ensureRootIsScheduled(root)
    return
  }
  if (__DEV__) {
    console.warn('render阶段开始')
  }
  // 初始化
  prepareFreshStack(root, lane)

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
  root.finishedLane = lane
  wipRenderLane = NoLane

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
  const lane = root.finishedLane
  if (lane === NoLane && __DEV__) {
    console.error('commit阶段 finishedLane不应该是NoLane')
  }

  // 重置
  root.finishedWork = null
  root.finishedLane = NoLane
  markRootFinished(root, lane)
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
  const next = beginWork(wip, wipRenderLane)
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
