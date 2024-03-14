import { Props, ReactElement } from 'shared/ReactTypes'
import {
  FiberNode,
  createFiberFromElement,
  createWorkInProgress,
} from './fiber'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { HostText } from './workTags'
import { ChildDeletion, Placement } from './fiberFlags'

type ExistingChildren = Map<string | number, FiberNode>

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
  function deleteRemainingChildren(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
  ) {
    if (!shouldTrackEffects) return
    let childToDelete = currentFirstChild
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
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

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number,
  ) {
    while (currentFiber !== null) {
      // update
      if (currentFiber.tag === HostText) {
        // 文本节点，只需要判断 tag即可
        const existing = useFiber(currentFiber, { content })
        existing.return = returnFiber
        // 删除所有兄弟节点
        deleteRemainingChildren(returnFiber, currentFiber.sibling)
        return existing
      }
      // 之前该fiber不是HostText eg：<span/> -> 'span'
      deleteChild(returnFiber, currentFiber)
      // 查看兄弟节点是否可以复用
      currentFiber = currentFiber.sibling
    }

    // mount或者 update不能复用fiber的情况
    const fiber = new FiberNode(HostText, { content }, null)
    fiber.return = returnFiber // NOTE: HostText return的关系挂载在这里
    return fiber
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
  // single的含义是本次渲染只有一个子元素,两种情况 多变一(abc->a) || 一变一(a->b)
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElement,
  ) {
    const key = element.key
    // 基于key不会重复这一前提，尽量寻找key和element.key相同的fiber，尝试复用。
    while (currentFiber !== null) {
      // update html元素 key和type都相同，就复用，否则删除本fiber并创建新的fiber
      if (key === currentFiber.key) {
        // key相同
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (element.type === currentFiber.type) {
            // key相同,type也相同，复用fiber
            const existing = useFiber(currentFiber, element.props)
            existing.return = returnFiber
            // 因为只有一个child，所以要删除所有兄弟节点
            deleteRemainingChildren(returnFiber, currentFiber.sibling)
            return existing
          }
          // key相同type不同，删除所有旧的(因为兄弟节点不会有key相同的情况了)，底下会创建一个新的。作为singleChild
          deleteRemainingChildren(returnFiber, currentFiber)
          break
        } else {
          if (__DEV__) {
            console.warn('还未实现的react类型', element)
          }
          break
        }
      } else {
        // key不同，删除本fiber，挪指针看sibling是否有可以复用的
        deleteChild(returnFiber, currentFiber)
        currentFiber = currentFiber.sibling
      }
    }

    // mount阶段，或者update中需要删除旧fiber创建新fiber的情况，根据element创建fiber
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber // NOTE: HostComponent和FunctionComponent return的关系挂载在这里
    return fiber
  }

  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    childArray: any[],
  ): FiberNode | null {
    let firstNewFiber: FiberNode | null = null
    let lastNewFiber: FiberNode | null = null
    let lastPlacedIndex: number = 0
    // 1. 将returnFiber的所有子节点保存在map中
    const existingChildren: ExistingChildren = new Map()
    let current = currentFirstChild
    while (current) {
      const keyToUse = current.key !== null ? current.key : current.index
      existingChildren.set(keyToUse, current)
      current = current.sibling
    }
    for (let i = 0; i < childArray.length; i++) {
      // 2. 遍历newChild，判断是否可复用，和reconcile单节点一样，要判断节点的类型。
      const after = childArray[i]
      const newFiber = updateFromMap(returnFiber, existingChildren, i, after)
      if (newFiber === null) {
        // 本次组件render返回了 false或者null
        continue
      }
      // 3. 标记移动还是插入(此时可复用fiber已从existingChildren中移除)
      newFiber.index = i
      newFiber.return = returnFiber
      if (lastNewFiber === null) {
        lastNewFiber = newFiber
        firstNewFiber = newFiber
      } else {
        lastNewFiber.sibling = newFiber
        lastNewFiber = lastNewFiber.sibling
      }
      if (!shouldTrackEffects) continue

      const current = newFiber.alternate
      if (current !== null) {
        // update阶段，并且newFiber不是新增，判断是否需要右移
        let oldIndex = current.index
        if (oldIndex < lastPlacedIndex) {
          // 该fiber之前在lastPlacedIndex对应的fiber之前，
          // 更新以后在lastPlacedIndex对应的fiber之后。
          // 标记移动，右移
          lastNewFiber.flags |= Placement
        } else {
          // 不移动
          lastPlacedIndex = oldIndex
        }
      } else {
        // mount阶段，或者newFiber是新增的
        newFiber.flags |= Placement
      }
    }
    // 4. 将map中剩下的标记为删除
    existingChildren.forEach(fiber => {
      deleteChild(returnFiber, fiber)
    })

    return firstNewFiber
  }

  // 如果fiber可复用，就会把其从existingChildren的map中移除
  function updateFromMap(
    returnFiber: FiberNode,
    existingChildren: ExistingChildren,
    index: number,
    element: any,
  ): FiberNode | null {
    const keyToUse = element.key !== null ? element.key : index
    const before = existingChildren.get(keyToUse)
    // 根据element类型来采取不同的比对方案

    // 新节点为 HostText
    if (typeof element === 'string' || typeof element === 'number') {
      if (before && before.tag === HostText) {
        // 之前的节点也是HostFiber，那么可以复用
        existingChildren.delete(keyToUse)
        return useFiber(before, { content: element + '' })
      }
      // 不能复用
      return new FiberNode(HostText, { content: element + '' }, keyToUse)
    }

    // ReactElement
    if (typeof element === 'object' && element !== null) {
      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (before && before.type === element.type) {
            // key和type都相同，可以复用
            existingChildren.delete(keyToUse)
            return useFiber(before, element.props)
          }
          // 不能复用
          return createFiberFromElement(element)
      }
      // TODO: 数组类型
      if (Array.isArray(element) && __DEV__) {
        console.warn('还未实现数组类型的child')
      }
    }
    return null
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
          // 新的child只有一个
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFiber, newChild),
          )

        default:
          if (__DEV__) {
            console.warn('非REACT_ELEMENT_TYPE', newChild)
          }
          break
      }
      // 新的child有多个
      if (Array.isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFiber, newChild)
      }
    }

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
