import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'
import { Lane } from './fiberLanes'

export interface Update<State> {
  action: Action<State>
  next: Update<any> | null
  lane: Lane
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(
  action: Action<State>,
  lane: Lane,
): Update<State> => {
  return {
    action,
    lane,
    next: null,
  }
}

export const createUpdateQueue = <State>() => {
  return {
    shared: {
      pending: null,
    },
    dispatch: null,
  } as UpdateQueue<State>
}

export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>,
) => {
  /* 
  // 构建环形链表，updateQueue.shared.pending指向最后一个update，其next为第一个。
  const pending = updateQueue.shared.pending
  if (pending === null) {
    update.next = update
  } else {
    // 让update的next指向第一个
    update.next = pending.next
    // 将update加入到链表中
    pending.next = update
  }
  updateQueue.shared.pending = update 
  */

  // 构建环形链表，updateQueue.shared.pending指向最后一个update，其next为第一个update。
  const pending = updateQueue.shared.pending // 老队尾
  const first = pending?.next || update // 队头
  update.next = first // 新队尾
  if (pending) {
    // 新队尾，入队。 如果有老队尾，将新队尾插入到老队尾后面。
    pending.next = update
  }
  // 修改pending指向新队尾
  updateQueue.shared.pending = update
}

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State>,
  renderLane: Lane,
): { memoizedState: State } => {
  const result = { memoizedState: baseState }
  if (pendingUpdate !== null) {
    // 一般来说大部分queue里是没有update的
    const first = pendingUpdate.next
    let pending = pendingUpdate.next!
    do {
      const updateLane = pending.lane
      if (updateLane === renderLane) {
        const action = pendingUpdate.action
        if (action instanceof Function) {
          // action: (prevState:State)=>State
          baseState = action(baseState)
        } else {
          // action: State
          baseState = action
        }
      } else {
        if (__DEV__) {
          console.error('不应该进入updateLane !== renderLane逻辑')
        }
      }
      pending = pending.next!
    } while (pending !== first)
  }
  // updateQueue的清空，在外部实现
  result.memoizedState = baseState
  return result
}
