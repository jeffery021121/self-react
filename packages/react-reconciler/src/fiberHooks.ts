import internals from 'shared/internals'
import { FiberNode } from './fiber'
import {
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
} from './updateQueue'
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workLoop'
import { Lane, NoLane, requestUpdateLane } from './fiberLanes'
import { Flags, PassiveEffect } from './fiberFlags'
import { HookHasEffect, Passive } from './hookEffectTags'

const { currentDispatcher } = internals
let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null // 当前处理的hook，类比wipFiber
let currentHook: Hook | null = null // 上次render时的 wipHook对应hook，类比 currentFiber
let renderLane = NoLane
interface Hook {
  next: Hook | null
  memoizedState: any // hook自身的状态数据
  updateQueue: unknown
}
export interface Effect {
  tag: Flags
  create: EffectCallback | undefined
  destroy: EffectCallback | undefined
  deps: EffectDeps
  next: Effect | null
}
export type EffectCallback = () => void
export type EffectDeps = any[] | null
export interface FCUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null // effect链表的最后一个
}

export function renderWithHooks(wip: FiberNode, lane: Lane) {
  // 赋值操作
  currentlyRenderingFiber = wip
  wip.memoizedState = null // 重置 hooks链表，因为在后续操作中，将创造 其hook链表 （fc中该字段保留的是hook链表）
  wip.updateQueue = null // 重置 effect链表
  renderLane = lane
  const current = wip.alternate
  if (current === null) {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount
  } else {
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate
  }

  const Component = wip.type
  const props = wip.pendingProps
  const children = Component(props)

  // 重置操作
  currentlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null
  renderLane = NoLane
  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect,
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect,
}

// 进入mount阶段，返回当前hook，并调整workInProgressHook指向当前hook
function mountWorkInProgressHook(): Hook {
  // 创建一个新的hook
  const hook: Hook = {
    memoizedState: null,
    next: null,
    updateQueue: null,
  }

  if (workInProgressHook === null) {
    // 函数执行时，第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件内调用hook')
    } else {
      workInProgressHook = hook
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // 函数执行时 后续的hook，注意，整个函数都只在mount阶段执行
    workInProgressHook.next = hook
    workInProgressHook = hook
  }

  return workInProgressHook
}

// 进入update阶段，返回当前hook，并调整workInProgressHook指向当前hook，
// 调整currentHook指向之前render时wipHook对应的hook，从而让wipHook拿到currentHook内保留的数据
function updateWorkInProgressHook() {
  let nextCurrentHook: Hook | null = null
  if (currentHook === null) {
    // update阶段，第一个hook
    const current = currentlyRenderingFiber?.alternate
    if (current !== null) {
      nextCurrentHook = current?.memoizedState
    } else {
      nextCurrentHook = null
      if (__DEV__) {
        console.warn('update时逻辑错误，找不到currentFiber')
      }
    }
  } else {
    // update阶段，后续的hook
    nextCurrentHook = currentHook.next
  }

  /**
   * 本fc的第一次 useHook处理后，currentHook指向currentFiber的第一个hook
   * 第二次 currentHook指向currentFiber的第2个hook
   * ...
   */
  if (nextCurrentHook === null) {
    // 1，current===null 上面已经报警过了，是其他逻辑的错误
    // 2，本次hook比上次多，有可能hook定义在判断语句中了
    throw new Error(
      `组件${currentlyRenderingFiber?.type}本次执行时Hook比上一次多`,
    )
  }

  currentHook = nextCurrentHook as Hook

  // 为了拿到之前更新对应hook的数据。
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    next: null,
  }

  // 下面是复用的mountWorkInProgressHook的逻辑, 更新wipHook，并调整其指针
  if (workInProgressHook === null) {
    // 函数执行时，第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件内调用hook')
    } else {
      workInProgressHook = newHook
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // 函数执行时 后续的hook，注意，整个函数都只在update阶段执行
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }

  return workInProgressHook
}

function mountState<State>(
  initialState: (() => State) | State,
): [State, Dispatch<State>] {
  // 找到当前useState对应的hook的数据
  const hook = mountWorkInProgressHook()
  let memoizedState =
    initialState instanceof Function ? initialState() : initialState

  const updateQueue = createUpdateQueue<State>()
  hook.updateQueue = updateQueue

  const dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber!,
    updateQueue as UpdateQueue<unknown>,
  )
  // 最后一个参数 action，需要在dispatch调用时传入。
  // 使用了bind，意味着dispatch可以脱离函数组件甚至react环境使用，因为其内部已经绑定好了fiber

  updateQueue.dispatch = dispatch
  hook.memoizedState = memoizedState

  return [memoizedState, dispatch]
}

function updateState<State>(): [State, Dispatch<State>] {
  // 找到当前useState对应的hook，会复用老的hook，并移除其next指向
  const hook = updateWorkInProgressHook()

  // hook上的updateQueue和fiber上的updateQueue设计一样，是在current和wip上复用的
  const updateQueue = hook.updateQueue as UpdateQueue<State>

  // 计算新的state
  const pendingUpdate = updateQueue.shared.pending
  updateQueue.shared.pending = null
  if (pendingUpdate) {
    const { memoizedState } = processUpdateQueue(
      hook.memoizedState,
      pendingUpdate,
      renderLane,
    )
    hook.memoizedState = memoizedState
  }

  return [hook.memoizedState, updateQueue.dispatch!]
}

/* 
在函数组件中的用法：
const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber!, updateQueue)
fc中：
const [state,dispatch] = useState(initState)
dispatch(newState)
*/
function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>,
) {
  // 这里和updateContainer的逻辑是一样的
  const lane = requestUpdateLane()
  const update = createUpdate(action, lane)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber, lane)
}

function mountEffect(
  create: EffectCallback | undefined,
  deps: EffectDeps | undefined,
) {
  const hook = mountWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  currentlyRenderingFiber!.flags |= PassiveEffect
  hook.memoizedState = pushEffect(
    Passive | HookHasEffect,
    create,
    undefined,
    nextDeps,
  )
}

function updateEffect(
  create: EffectCallback | undefined,
  deps: EffectDeps | undefined,
) {
  const hook = updateWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  let destroy: EffectCallback | undefined
  if (currentHook !== null) {
    const preEffect = currentHook.memoizedState as Effect
    destroy = preEffect.destroy
    if (nextDeps !== null) {
      // 浅比较依赖
      const preDeps = preEffect.deps
      if (areHookInputsEqual(nextDeps, preDeps)) {
        hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps)
        return
      }
    }
    // 浅比较，不相等
    currentlyRenderingFiber!.flags |= PassiveEffect
    hook.memoizedState = pushEffect(
      Passive | HookHasEffect,
      create,
      destroy,
      nextDeps,
    )
  }
}

function areHookInputsEqual(nextDeps: EffectDeps, preDeps: EffectDeps) {
  if (!preDeps || !nextDeps) return false
  for (let i = 0; i < preDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], preDeps[i])) continue
    return false
  }
  return true
}

function pushEffect(
  hookFlags: Flags,
  create: EffectCallback | undefined,
  destroy: EffectCallback | undefined,
  deps: EffectDeps,
): Effect {
  const effect: Effect = {
    tag: hookFlags,
    create,
    destroy,
    deps,
    next: null,
  }
  const fiber = currentlyRenderingFiber!
  let updateQueue = fiber.updateQueue as FCUpdateQueue<any>
  if (updateQueue === null) {
    updateQueue = createFCUpdateQueue()
    fiber.updateQueue = updateQueue
  }
  // 构建effect环状链表
  const lastEffect = updateQueue.lastEffect
  const firstEffect = lastEffect?.next || effect
  effect.next = firstEffect
  if (lastEffect) lastEffect.next = effect
  updateQueue.lastEffect = effect
  return effect
}

function createFCUpdateQueue<State>() {
  const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>
  updateQueue.lastEffect = null
  return updateQueue
}
