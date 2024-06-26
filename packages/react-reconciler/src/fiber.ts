import { Props, Key, Ref, ReactElement } from 'shared/ReactTypes'
import { FunctionComponent, HostComponent, Fragment, WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'
import { Container } from 'hostConfig'
import { Lane, Lanes, NoLane, NoLanes } from './fiberLanes'
import { Effect } from './fiberHooks'
export class FiberNode {
  // 实例相关属性
  tag: WorkTag // 四种数字分别表示，函数和类组件；根节点；宿主组件(浏览器下就是div,p等)；宿主文字
  key: Key
  stateNode: any // eg: 对于HostComponent来说，这个stateNode就保留了对应的 div Dom
  type: any // eg: 对于一个FunctionComponent来说，type就是函数本身，对于HostComponent来说，type就是标签的string，例如 'div','p'等
  ref: Ref

  // 节点关系相关属性
  return: FiberNode | null
  sibling: FiberNode | null
  child: FiberNode | null
  index: number

  // 工作单元相关属性
  pendingProps: Props // 开始处理之前的props
  memoizedProps: Props | null // 处理完成之后的props
  memoizedState: any // 处理完成之后的state
  alternate: FiberNode | null // 指向另一棵树上的相同节点
  updateQueue: unknown

  // 副作用
  flags: Flags
  subtreeFlags: Flags
  deletions: FiberNode[] | null

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例相关属性 tag,key,stateNode,type
    this.tag = tag
    this.key = key || null
    this.ref = null
    this.stateNode = null // eg: 对于HostComponent来说，这个stateNode就保留了对应的 div Dom
    this.type = null // eg: 对于一个FunctionComponent来说，type就是函数本身

    // 节点关系相关属性
    this.return = null // 父fiberNode
    this.sibling = null // 下一个兄弟fiberNode
    this.child = null // 第一个子fiberNode
    this.index = 0 // 在兄弟中的索引

    // 工作单元相关
    this.pendingProps = pendingProps
    this.memoizedProps = null
    this.alternate = null // 指向另一棵fiber树上的相同节点
    this.updateQueue = null
    this.memoizedState = null // functionComponent中指向了第0项hook,hook内部通过next指针，指向下一个hook
    // 副作用
    this.flags = NoFlags
    this.subtreeFlags = NoFlags
    this.deletions = null
  }
}
export interface PendingPassiveEffects {
  unMount: Effect[]
  update: Effect[]
}
export class FiberRootNode {
  container: Container // 在dom环境下，就是那个 #app的 dom
  current: FiberNode // currentRootFiber
  finishedWork: FiberNode | null // 已经完成整个更新流程的 rootFiber
  pendingLanes: Lanes // 所有得渲染的优先级
  finishedLane: Lane // 本次处理的优先级
  pendingPassiveEffects: PendingPassiveEffects
  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container
    this.current = hostRootFiber
    this.current.stateNode = this
    this.finishedWork = null
    this.pendingLanes = NoLanes
    this.finishedLane = NoLane
    this.pendingPassiveEffects = {
      unMount: [],
      update: [],
    }
  }
}

export const createWorkInProgress = (
  current: FiberNode,
  pendingProps: Props,
) => {
  let wip = current.alternate

  if (wip === null) {
    // mount阶段
    wip = new FiberNode(current.tag, pendingProps, current.key)
    wip.stateNode = current.stateNode

    wip.alternate = current
    current.alternate = wip
  } else {
    // update阶段
    wip.pendingProps = pendingProps
    wip.flags = NoFlags
    wip.subtreeFlags = NoFlags
    wip.deletions = null
  }

  wip.type = current.type
  wip.updateQueue = current.updateQueue
  wip.child = current.child
  // 这里貌似没有处理 return和sibling
  wip.memoizedProps = current.memoizedProps
  wip.memoizedState = current.memoizedState
  return wip
}

export function createFiberFromElement(element: ReactElement): FiberNode {
  const { type, key, props } = element
  let fiberTag: WorkTag = FunctionComponent
  if (typeof type === 'string') {
    fiberTag = HostComponent
  } else if (typeof type !== 'function' && __DEV__) {
    console.warn('未定义的type类型', type)
  }
  const fiber = new FiberNode(fiberTag, props, key)
  fiber.type = type
  return fiber
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
  const fiber = new FiberNode(Fragment, elements, key)
  return fiber
}
