import internals from 'shared/internals'
import { FiberNode } from './fiber'
import {
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
} from './updateQueue'
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workLoop'

const { currentDispatcher } = internals
let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
interface Hook {
  next: Hook | null
  memoizedState: any // hook自身的状态数据
  updateQueue: unknown
}

export function renderWithHooks(wip: FiberNode) {
  // 赋值操作
  currentlyRenderingFiber = wip
  wip.memoizedState = null // 因为在后续操作中，将创造 其hook链表 （fc中该字段保留的是hook链表）

  const current = wip.alternate
  if (current) {
    // update
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount
  }

  const Component = wip.type
  const props = wip.pendingProps
  const children = Component(props)

  // 重置操作
  currentlyRenderingFiber = null
  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
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
  interface Abc {
    bind<T, A extends any[], B extends any[], R>(
      this: (this: T, ...args: [...A, ...B]) => R,
      thisArg: T,
      ...args: A
    ): (...args: B) => R
  }

  updateQueue.dispatch = dispatch
  hook.memoizedState = memoizedState

  return [memoizedState, dispatch]
}

// 进入mount阶段
function mountWorkInProgressHook(): Hook {
  // 创建一个新的hook
  const hook: Hook = {
    memoizedState: null,
    next: null,
    updateQueue: null,
  }

  if (workInProgressHook === null) {
    // mount时，第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件内调用hook')
    } else {
      workInProgressHook = hook
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount时 后续的hook，注意，整个函数都只在mount阶段执行
    workInProgressHook.next = hook
    workInProgressHook = hook
  }

  return workInProgressHook
}

/* 
在mountState中的用法：
const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber!, updateQueue)
*/
function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>,
) {
  // 这里和updateContainer的逻辑是一样的
  const update = createUpdate(action)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber)
}
