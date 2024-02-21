import { Props, Key, Ref } from 'shared/ReactTypes'
import { WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'
export class FiberNode {
  // 实例相关属性
  tag: WorkTag
  key: Key
  stateNode: any
  type: any
  ref: Ref

  // 节点关系相关属性
  return: FiberNode | null
  sibling: FiberNode | null
  child: FiberNode | null
  index: number

  // 工作单元相关属性
  pendingProps: Props // 开始处理之前的props
  memoizedProps: Props | null // 处理完成之后的props
  alternate: FiberNode | null // 指向另一棵树上的相同节点
  flags: Flags
  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例相关属性 tag,key,stateNode,type
    this.tag = tag
    this.key = key
    this.ref = null

    // HostComponent <div>
    this.stateNode = null // eg: 对于HostComponent来说，这个stateNode就保留了对应的 div Dom

    // FunctionComponent ()=>{}
    this.type = null // eg: 对于一个FunctionComponent来说，type就是函数本身

    // 节点关系相关属性
    this.return = null // 父fiberNode
    this.sibling = null // 下一个兄弟fiberNode
    this.child = null // 第一个子fiberNode
    this.index = 0 // 在兄弟中的索引

    // 工作单元相关
    this.pendingProps = pendingProps
    this.memoizedProps = null
    this.alternate = null
    this.flags = NoFlags // 副作用
  }
}
