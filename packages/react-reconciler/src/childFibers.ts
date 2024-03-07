import { Props, ReactElement } from 'shared/ReactTypes'
import {
  FiberNode,
  createFiberFromElement,
  createWorkInProgress,
} from './fiber'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { HostText } from './workTags'
import { ChildDeletion, Placement } from './fiberFlags'

function ChildReconciler(shouldTrackEffects: boolean) {
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackEffects) return
    let deletions = returnFiber.deletions
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      deletions.push(childToDelete)
    }
  }

  /**
   * 根据currentFiber和element，返回本轮currentFiber对应的fiber
   * 在mount阶段会返回一个新的fiber。
   *
   * 在update阶段，如果本fiber可以复用，
   * 通过createWorkInProgress洗干净fiber.alternate上的属性，
   * 并返回fiber.alternate（这里是current和wip两个相同fiber节点的复用）
   */
  // 根据currentFiber和element 返回本轮currentFiber对应的fiber
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElement,
  ) {
    const key = element.key
    if (currentFiber !== null) {
      // update html元素 key和type都相同，就复用，否则删除本fiber并创建新的fiber
      if (key === currentFiber.key) {
        // key相同
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (element.type === currentFiber.type) {
            // type也相同，复用fiber
            const existing = useFiber(currentFiber, element.props)
            existing.return = returnFiber
            return existing
          }
          // type不同，删除旧的
          deleteChild(returnFiber, currentFiber)
        } else {
          if (__DEV__) {
            console.warn('还未实现的react类型', element)
          }
        }
      } else {
        // key不同，删除旧的
        deleteChild(returnFiber, currentFiber)
      }
    }

    // mount阶段，或者update中需要删除旧fiber创建新fiber的情况，根据element创建fiber
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber // NOTE: HostComponent和FunctionComponent return的关系挂载在这里
    return fiber
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number,
  ) {
    if (currentFiber !== null) {
      // update
      if (currentFiber.tag === HostText) {
        // 文本节点，只需要判断 tag即可
        const existing = useFiber(currentFiber, { content })
        existing.return = returnFiber
        return existing
      }
      // 之前该fiber不是HostText eg：<span/> -> 'span'
      deleteChild(returnFiber, currentFiber)
    }

    // mount或者 update不能复用fiber的情况
    const fiber = new FiberNode(HostText, { content }, null)
    fiber.return = returnFiber // NOTE: HostText return的关系挂载在这里
    return fiber
  }

  function placeSingleChild(fiber: FiberNode) {
    if (shouldTrackEffects && fiber.alternate === null) {
      // shouldTrackEffects应该追踪副作用，且current为nul 新节点。即update阶段的新节点。
      // 同时mount阶段，App对应的fiber也会进来
      fiber.flags |= Placement // 按位或 其实这里如果是初始创建，可以直接用 =
      console.warn('fiber被标记Placement', fiber)
    }
    return fiber
  }

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild: ReactElement | undefined,
  ) {
    // 判断reactElement类型
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFiber, newChild),
          )

        default:
          if (__DEV__) {
            console.warn('非REACT_ELEMENT_TYPE', newChild)
          }
          break
      }
    }
    // 多节点情况 ul> li*3 暂未支持

    // HostText，文本类型会直接显示文本本身，即string或者number类型，此时newChild其实就是具体的 content
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFiber, newChild),
      )
    }
    if (currentFiber) {
      // 兜底删除
      deleteChild(returnFiber, currentFiber)
      if (__DEV__) {
        console.warn('未实现的reconcile类型', newChild)
      }
    }
    return null
  }
}

function useFiber(fiber: FiberNode, pendingProps: Props) {
  const clone = createWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

export const reconcileChildFibers = ChildReconciler(true)
export const mountChildFibers = ChildReconciler(false)
