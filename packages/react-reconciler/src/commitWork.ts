import {
  Container,
  Instance,
  appendChildToContainer,
  commitUpdate,
  insertChildToContainer,
  removeChild,
} from 'hostConfig'
import { FiberNode, FiberRootNode } from './fiber'
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Placement,
  Update,
} from './fiberFlags'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'

let nextEffect: FiberNode | null = null
export const commitMutationEffects = (finishedWork: FiberNode) => {
  // 找到所有非noFlags的flag,并且根据flag做dom处理
  nextEffect = finishedWork

  while (nextEffect !== null) {
    const child: FiberNode | null = nextEffect.child
    if (
      (nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
      child !== null
    ) {
      // 一直向下找到 subtreeFlags & MutationMask为 NoFlags，开始进入向上模式，并处理flags
      nextEffect = child
    } else {
      // 进入向上逻辑，这里有两种情况，一种是child为null，一种是该nextEffect.subtreeFlags 上没有MutationMask相关flag了
      while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect)
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
function commitMutationEffectsOnFiber(finishedWork: FiberNode) {
  const flags = finishedWork.flags

  // 处理Placement 标记
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    // NOTE: finishedWork.flags 移除Placement标记
    finishedWork.flags &= ~Placement // 从flags中，移除Placement标记
  }

  // 处理ChildDeletion 标记
  if ((flags & ChildDeletion) !== NoFlags) {
    // commitChildDeletion(finishedWork)
    const deletions = finishedWork.deletions
    if (deletions !== null) {
      deletions.forEach(childToDelete => {
        commitDeletion(childToDelete)
      })
    }

    // NOTE: finishedWork.flags 移除Placement标记
    finishedWork.flags &= ~ChildDeletion // 从flags中，移除Placement标记
  }
  // 处理Update 标记
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    // NOTE: finishedWork.flags 移除Placement标记
    finishedWork.flags &= ~Update // 从flags中，移除Placement标记
  }
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

function commitDeletion(childToDelete: FiberNode) {
  let rootHostNode: FiberNode | null = null
  // dfs处理子树
  commitNestComponent(childToDelete, unmountFiber => {
    // 根据不同的类型，做不同处理
    switch (unmountFiber.tag) {
      case HostComponent:
        // TODO: 解除ref绑定

        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        return
      case HostText:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        return
      case FunctionComponent:
        // TODO: useEffect unMount流程处理
        return
      default:
        if (__DEV__) {
          console.warn('未处理的unmount类型', unmountFiber)
        }
    }
  })
  // 移除根dom
  if (rootHostNode !== null) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent !== null) {
      removeChild((rootHostNode as FiberNode).stateNode, hostParent)
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
