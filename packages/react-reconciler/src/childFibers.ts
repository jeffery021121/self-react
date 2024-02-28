import { ReactElement } from 'shared/ReactTypes'
import { FiberNode, createFiberFromElement } from './fiber'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { HostText } from './workTags'
import { Placement } from './fiberFlags'

function ChildReconciler(shouldTrackEffects: boolean) {
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElement,
  ) {
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber // NOTE: HostComponent和FunctionComponent return的关系挂载在这里
    return fiber
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number,
  ) {
    const fiber = new FiberNode(HostText, { content }, null)
    fiber.return = returnFiber // NOTE: HostText return的关系挂载在这里
    return fiber
  }

  function placeSingleChild(fiber: FiberNode) {
    if (shouldTrackEffects && fiber.alternate === null) {
      // shouldTrackEffects应该追踪副作用，且current为nul 新节点。即update阶段的新节点
      fiber.flags |= Placement // 按位或 其实这里如果是初始创建，可以直接用 =
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

    // HostText，文本类型会直接显示文本本身，即string或者number类型
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFiber, newChild),
      )
    }
    return null
  }
}
export const reconcileChildFibers = ChildReconciler(true)
export const mountChildFibers = ChildReconciler(false)
