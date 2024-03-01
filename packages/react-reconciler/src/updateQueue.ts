import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'

export interface Update<State> {
  action: Action<State>
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(action: Action<State>) => {
  return {
    action,
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
  updateQueue.shared.pending = update
}

// 简版，只处理了一个update。
export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State>,
): { memoizedState: State } => {
  const result = { memoizedState: baseState }
  const action = pendingUpdate.action
  if (action instanceof Function) {
    // action: (prevState:State)=>State
    result.memoizedState = action(baseState)
  } else {
    // action: State
    result.memoizedState = action
  }

  return result
}
