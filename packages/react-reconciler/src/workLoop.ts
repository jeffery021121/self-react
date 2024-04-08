import { scheduleMicroTask } from 'hostConfig'
import { beginWork } from './beginWork'
import {
  commitHookEffectListCreate,
  commitHookEffectListDestroy,
  commitHookEffectListUnmount,
  commitMutationEffects,
} from './commitWork'
import { completeWork } from './completeWork'
import {
  FiberNode,
  FiberRootNode,
  PendingPassiveEffects,
  createWorkInProgress,
} from './fiber'
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags'
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
import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_NormalPriority as NormalPriority,
} from 'scheduler'
import { HookHasEffect, Passive } from './hookEffectTags'

let workInProgress: FiberNode | null
let wipRenderLane: Lane = NoLane
let rootDoesHavePassiveEffects: boolean = false

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

  if (
    (finishedWork.flags & PassiveMask) !== NoFlags ||
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffects) {
      rootDoesHavePassiveEffects = true
      // 调度副作用
      scheduleCallback(NormalPriority, () => {
        // 异步执行副作用
        flushPassiveEffect(root.pendingPassiveEffects)
        return
      })
    }
  }
  // 判断是否存在3个子阶段需要执行的操作
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags
  const rootHasEffect =
    (finishedWork.flags & (MutationMask | PassiveMask)) !== NoFlags

  if (subtreeHasEffects || rootHasEffect) {
    // beforeMutation阶段
    // mutation 处理MutationMask相关的flags，处理PassiveMask相关flags
    // 处理普通flag成dom操作，处理PassiveEffect flag，收集副作用
    commitMutationEffects(finishedWork, root)
    root.current = finishedWork // 双缓冲

    // layout阶段
  } else {
    root.current = finishedWork // 双缓冲
  }
  rootDoesHavePassiveEffects = false
  ensureRootIsScheduled(root) // NOTE: 可能会存在多个不同优先级的任务，本次处理完以后，处理下一个优先级
}

function flushPassiveEffect(pendingPassiveEffects: PendingPassiveEffects) {
  // 处理卸载需要执行的effect
  pendingPassiveEffects.unMount.forEach(effect => {
    commitHookEffectListUnmount(Passive, effect)
  })
  pendingPassiveEffects.unMount = []

  // 处理deps变化触发的effect
  pendingPassiveEffects.update.forEach(effect => {
    commitHookEffectListDestroy(Passive | HookHasEffect, effect)
  })
  pendingPassiveEffects.update.forEach(effect => {
    commitHookEffectListCreate(Passive | HookHasEffect, effect)
  })
  pendingPassiveEffects.update = []

  // effect注册函数执行过程中，可能会产生新的更新
  flushSyncCallbacks()
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
