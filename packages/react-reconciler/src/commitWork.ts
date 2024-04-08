import {
  Container,
  Instance,
  appendChildToContainer,
  commitUpdate,
  insertChildToContainer,
  removeChild,
} from 'hostConfig'
import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber'
import {
  ChildDeletion,
  Flags,
  MutationMask,
  NoFlags,
  PassiveEffect,
  PassiveMask,
  Placement,
  Update,
} from './fiberFlags'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'
import { Effect, EffectCallback, FCUpdateQueue } from './fiberHooks'
import { HookHasEffect } from './hookEffectTags'

let nextEffect: FiberNode | null = null
export const commitMutationEffects = (
  finishedWork: FiberNode,
  root: FiberRootNode,
) => {
  // 找到所有非noFlags的flag,并且根据flag做dom处理
  nextEffect = finishedWork

  while (nextEffect !== null) {
    const child: FiberNode | null = nextEffect.child
    if (
      (nextEffect.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags &&
      child !== null
    ) {
      // 一直向下找到 subtreeFlags & MutationMask为 NoFlags，开始进入向上模式，并处理flags
      nextEffect = child
    } else {
      // 进入向上逻辑，这里有两种情况，一种是child为null，一种是该nextEffect.subtreeFlags 上没有MutationMask相关flag了
      while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect, root)
        // 向上过程中，先横向处理sibling
        const sibling: FiberNode | null = nextEffect.sibling
        if (sibling !== null) {
          nextEffect = sibling
          break
        }
        nextEffect = nextEffect.return
      }
    }
  }
}
// NOTE: 注意，虽然下文中在用finishedWork，但它只是指像一个个fiber，有点类似wip，并不一定是root.finishedWork
function commitMutationEffectsOnFiber(
  finishedWork: FiberNode,
  root: FiberRootNode,
) {
  const flags = finishedWork.flags

  // 处理Placement 标记
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement // 从flags中，移除Placement标记
  }

  // 处理ChildDeletion 标记
  if ((flags & ChildDeletion) !== NoFlags) {
    // commitChildDeletion(finishedWork)
    const deletions = finishedWork.deletions
    if (deletions !== null) {
      deletions.forEach(childToDelete => {
        commitDeletion(childToDelete, root)
      })
    }

    finishedWork.flags &= ~ChildDeletion // 从flags中，移除Placement标记
  }
  // 处理Update 标记
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update // 从flags中，移除Placement标记
  }
  // 处理PassiveEffect标记，收集update阶段effect回调
  if ((flags & PassiveEffect) !== NoFlags) {
    // 收集回调
    commitPassiveEffect(finishedWork, root, 'update')
    finishedWork.flags &= ~PassiveEffect
  }
}

function commitPassiveEffect(
  fiber: FiberNode,
  root: FiberRootNode,
  type: keyof PendingPassiveEffects,
) {
  // update unmount
  if (
    fiber.tag !== FunctionComponent ||
    (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)
  ) {
    // 非函数组件或者 函数组件内未标记有PassiveEffect(即本fiber此次没有effect回调执行)
    return
  }
  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>

  if (updateQueue !== null) {
    if (updateQueue.lastEffect === null) {
      if (__DEV__) {
        console.error('当FC存在PassiveEffect时，不应该没有lastEffect')
      }
    } else {
      // update回调执行时，还会看hook.tag 中是否有 hookHasEffect
      // unMount回调 则是直接执行hook.destroy
      root.pendingPassiveEffects[type].push(updateQueue.lastEffect)
    }
  }
}

// 组件卸载unmount，触发effect内注册的destroy回调
export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, effect => {
    const destroy = effect.destroy
    if (typeof destroy === 'function') destroy()
    // 卸载时，把hook上的HookHasEffect标记移除，防止之后的create执行
    effect.tag &= ~HookHasEffect
  })
}

// effect监听的数据变化，执行相应destroy函数
export function commitHookEffectListDestroy(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, effect => {
    const destroy = effect.destroy
    if (typeof destroy === 'function') destroy()
  })
}

// 初始化或者effect deps数据变化，执行相应create函数
export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, effect => {
    const create = effect.create
    if (typeof create === 'function')
      effect.destroy = create() as unknown as EffectCallback | undefined
  })
}

function commitHookEffectList(
  flags: Flags,
  lastEffect: Effect,
  callback: (effect: Effect) => void,
) {
  let effect = lastEffect.next!
  do {
    if ((effect.tag & flags) === flags) {
      callback(effect)
    }
    effect = effect.next!
  } while (effect !== lastEffect.next)
}

function commitPlacement(finishedWork: FiberNode) {
  if (__DEV__) {
    console.warn('执行Placement操作', finishedWork)
  }
  // parent Dom
  const hostParent = getHostParent(finishedWork)

  // hostSibling，如果能找到hostSibling，那就是移动，如果找不到，就是插入
  const hostSibling = getHostSibling(finishedWork)

  // 找到finishedWork对应的dom，并插入到hostParent
  if (hostParent !== null) {
    insertOrAppendPlacementNodeIntoContainer(
      finishedWork,
      hostParent,
      hostSibling,
    )
  }
}

function getHostParent(finishedWork: FiberNode): Container | null {
  let parent = finishedWork.return
  while (parent) {
    const parentTag = parent.tag
    if (parentTag === HostComponent) {
      return parent.stateNode as Container
    }
    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container
    }
    parent = parent.return
  }
  if (__DEV__) {
    console.warn('未找到hostParent')
  }
  return null
}

function getHostSibling(fiber: FiberNode) {
  let node: FiberNode = fiber
  fiberSibling: while (true) {
    while (node.sibling === null) {
      // 如果node没有sibling,就需要向上找到有sibling的祖先
      const parent = node.return
      if (
        parent === null ||
        parent.tag === HostComponent ||
        parent.tag === HostRoot
      ) {
        // 终止条件，往上找到的元素如果是null，一般来说，不会存在这一情况，除非是hostRoot节点
        // 终止条件，往上找到的元素如果是HostComponent或者HostRoot，那么证明node是没有hostSibling的
        return null
      }
      node = parent
    }
    node.sibling.return = node.return
    node = node.sibling
    // 运行到这里，确保了node一定有sibling,将node指针指向sibling开始向下查找的过程。
    while (node.tag !== HostText && node.tag !== HostComponent) {
      // 向下遍历
      if ((node.flags & Placement) !== NoFlags) {
        // 如果本节点不稳定，那么用它再向下查找hostNode，已经没有意义了。
        // 因为父节点的不稳定导致了子hostNode节点也不稳定。跳出本次向下循环。check本节点的兄弟节点。
        continue fiberSibling // 这里不要使用break，因为有可能终止所有循环
      }
      if (node.child === null) {
        // eg： render(){return false}
        // 已经到达叶子节点。跳出本次向下遍历。进入横向查找阶段。
        continue fiberSibling
      } else {
        // 稳定的 非HostNode 非叶子节点，继续向下遍历
        node.child.return = node
        node = node.child
      }
    }

    // 能进入到这里，证明一定结束了上个循环，且没有跳过本次fiberSibling循环，即找到了HostNode节点
    // 如果该hostNode不稳定，会进入到下一个fiberSibling循环
    if ((node.flags & Placement) === NoFlags) {
      // 稳定的sibling节点
      return node.stateNode
    }
  }
}

function insertOrAppendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance,
) {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildToContainer(finishedWork.stateNode, hostParent, before)
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode)
    }
    return
  }
  const child = finishedWork.child
  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent, before) // NOTE: 这里应该加上before
    let sibling = child.sibling
    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent, before)
      sibling = sibling.sibling
    }
  }
}

function recordHostChildrenToDelete(
  childrenToDelete: FiberNode[],
  unmountFiber: FiberNode, // 一定是dom节点
) {
  // NOTE: 删除所有 rootNode
  let lastOne = childrenToDelete[childrenToDelete.length - 1]
  // 1. 找到第一个root host节点
  if (!lastOne) {
    childrenToDelete.push(unmountFiber)
  } else {
    // NOTE: 因为是dfs遍历，所以如果lastOne有兄弟host节点(fragment的情况)，最终会遍历到这个兄弟节点的
    /**
     * <>
     *  <span id='1'>spanChild1</span>
     *  <span id='2'>spanChild2</span>
     * </>
     *
     * unmountFiber=id为1的span 会被记录成第一个lastOne，然后dfs处理 文本节点spanChild1，
     * 再向上到 unmountFiber=id为2的span，由于它是lastOne的兄弟节点，所以它也会被加入到 childrenToDelete 数组中
     */
    // 2. 每找到一个host节点，判断这个节点是不是 1 找到那个节点的兄弟节点
    let node = lastOne.sibling
    while (node) {
      if (unmountFiber === node) {
        childrenToDelete.push(unmountFiber)
      }
      node = node.sibling
    }
  }
}

function commitDeletion(childToDelete: FiberNode, root: FiberRootNode) {
  const rootChildrenToDelete: FiberNode[] = []
  // NOTE: dfs处理子树（执行ref解绑，调用unmount相关钩子函数），找到根hostNode，并删除。
  commitNestComponent(childToDelete, unmountFiber => {
    // 根据不同的类型，做不同处理
    switch (unmountFiber.tag) {
      case HostComponent:
        // TODO: 解除ref绑定

        // if (rootHostNode === null) {
        //   rootHostNode = unmountFiber
        // }
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        return
      case HostText:
        // if (rootHostNode === null) {
        //   rootHostNode = unmountFiber
        // }
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        return
      case FunctionComponent:
        // TODO: ref解绑
        commitPassiveEffect(unmountFiber, root, 'unMount')
        return
      default:
        if (__DEV__) {
          console.warn('未处理的unmount类型', unmountFiber)
        }
    }
  })
  // 移除根dom
  if (rootChildrenToDelete.length) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent !== null) {
      rootChildrenToDelete.forEach(node => {
        removeChild(node.stateNode, hostParent)
      })
    }
  }
  childToDelete.return = null
  childToDelete.child = null
}

function commitNestComponent(
  root: FiberNode,
  onCommitUnmount: (unmountFiber: FiberNode) => void,
) {
  // dfs遍历，并对每个fiber执行onCommitUnmount
  let node = root
  while (true) {
    onCommitUnmount(node)
    if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }

    if (node === root) {
      return
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}
