import { ReactElement } from 'shared/ReactTypes'
import { FiberNode } from './fiber'
import { UpdateQueue, processUpdateQueue } from './updateQueue'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'
import { reconcileChildFibers, mountChildFibers } from './childFibers'
import { renderWithHooks } from './fiberHooks'
// 递归中的递阶段，注意，这里参数是wip
export const beginWork = (wip: FiberNode) => {
  // 比较，返回子fiberNode
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip)
    case HostComponent:
      return updateHostComponent(wip)
    case HostText:
      return null
    case FunctionComponent:
      return updateFunctionComponent(wip)

    default:
      if (__DEV__) {
        console.warn('暂未实现FunctionComponent的beginWork功能', wip)
      }
      break
  }
  return null
}

function updateFunctionComponent(wip: FiberNode) {
  const nextChildren = renderWithHooks(wip)
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function updateHostRoot(wip: FiberNode) {
  const baseState = wip.memoizedState // 初始化阶段，其为null

  /**
   * 为什么updateQueue中update的action的数据类型是ReactElement，这要从初始化渲染说起
   * 参照 packages/react-reconciler/src/fiberReconciler.ts的updateContainer
   * 其在root.render(<App/>)时触发，将参数<App/>包装进了一个update: {action: {$$typeof:Symbol,props:Props...} as ElementApp}
   * 并将该update放入了 hostRootFiber的updateQueue中
   */
  const updateQueue = wip.updateQueue as UpdateQueue<ReactElement>

  const pending = updateQueue.shared.pending! // 取出当前update即 {action: ElementApp}
  updateQueue.shared.pending = null

  // 这里由于update.action并不是函数类型， 所以会直接把 ElementApp赋值给 memoizedState
  const { memoizedState } = processUpdateQueue(baseState, pending)
  wip.memoizedState = memoizedState
  // 返回子fiberNode
  const nextChildren = wip.memoizedState // ElementApp 即是rootComponent的子element
  // 上面所有的代码，是为了处理rootFiber上的更新，同时找到 nextChildren。
  reconcileChildren(wip, nextChildren)
  return wip.child
}

// div,p等html标签
function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps

  // hostComponent的子element很好找，在jsx转化成reactElement时，会把children塞入props中
  const nextChildren = nextProps.children

  reconcileChildren(wip, nextChildren)
  return wip.child
}

function reconcileChildren(wip: FiberNode, children?: ReactElement) {
  const current = wip.alternate
  // NOTE: child关系的挂载，在这里
  if (current !== null) {
    // update
    /**
     * 在初始化阶段，只有hostRootComponent的wip具有current
     */
    wip.child = reconcileChildFibers(wip, current?.child, children)
  } else {
    // mount
    wip.child = mountChildFibers(wip, null, children)
  }
}
