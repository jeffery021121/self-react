import { Container, appendChildToContainer } from 'hostConfig'
import { FiberNode, FiberRootNode } from './fiber'
import { MutationMask, NoFlags, Placement } from './fiberFlags'
import { HostComponent, HostRoot, HostText } from './workTags'

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

function commitMutationEffectsOnFiber(finishedWork: FiberNode) {
  const flags = finishedWork.flags

  // 处理Placement 标记
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    // NOTE: finishedWork.flags 移除Placement标记
    console.warn('从flags中，移除Placement标记', finishedWork)
    finishedWork.flags &= ~Placement // 从flags中，移除Placement标记
  }

  // 处理ChildDeletion 标记

  // 处理Update 标记
}

function commitPlacement(finishedWork: FiberNode) {
  if (__DEV__) {
    console.warn('执行Placement操作', finishedWork)
  }
  // parent Dom
  const hostParent = getHostParent(finishedWork)

  // 找到finishedWork对应的dom，并插入到hostParent
  if (hostParent !== null) {
    appendPlacementNodeIntoContainer(finishedWork, hostParent)
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

function appendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
) {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    appendChildToContainer(hostParent, finishedWork.stateNode)
    return
  }
  const child = finishedWork.child
  if (child !== null) {
    appendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling
    while (sibling !== null) {
      appendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
