import {
  Container,
  appendInitialChild,
  createInstance,
  createTextInstance,
} from 'hostConfig'
import { FiberNode } from './fiber'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'
import { NoFlags } from './fiberFlags'

// 递归中的归阶段
export const completeWork = (wip: FiberNode) => {
  // 构建一棵dom树
  const newProps = wip.pendingProps
  const current = wip.alternate
  switch (wip.tag) {
    case HostComponent:
      if (current !== null && wip.stateNode) {
        // update
      } else {
        // mount
        // 1.构建dom
        const instance = createInstance(wip.type, newProps)
        // 2.将dom插入到Dom树中
        appendAllChildren(instance, wip)
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostText:
      if (current !== null && wip.stateNode) {
        // update
      } else {
        // mount
        // 1.构建dom
        // props参见 reconcileSingleTextNode方法。
        const instance = createTextInstance(newProps.content)
        wip.stateNode = instance
      }
      bubbleProperties(wip)

      return null
    case HostRoot:
      bubbleProperties(wip)
      return null
    case FunctionComponent:
      // 这里不用特殊处理，是因为函数式组件内部的dom，会在其父组件appendAllChildren时递归处理掉
      bubbleProperties(wip)
      return null
    default:
      if (__DEV__) {
        console.warn('未处理的complete情况', wip)
      }
      break
  }
}

function appendAllChildren(parent: Container, wip: FiberNode) {
  // 这个parent其实应该是 wip对应的各自宿主环境的实例。
  /* 
    eg: 本例主要是演示，ReactElement的children 和 domNode的children可能不太一致。本方法就是通过fiber关系，合理挂载parentDom的children。
    <div>
      <B>
        <C>
          <span/>
          <p/>
        </C>
      </B>
    </div>
    */
  let node = wip.child
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node?.stateNode)
    } else if (node.child !== null) {
      // 例如 B和C 的tag为FunctionComponent。
      // 递归处理的目的，是要把span和p挂到div上
      node.child.return = node // NOTE: FunctionComponent return的关系挂载在这里
      node = node.child
      continue
    }

    if (node === wip) {
      // 这个判断写在这里，是为了防止处理wip的sibling关系
      return
    }

    // sibling相关逻辑处理(注：目前其实还没处理sibling生成相关逻辑，这里认为sibling已经正确挂载即可)
    // 没有兄弟节点时
    while (node.sibling === null) {
      if (node.return === null || node.return === wip) {
        // 如果父级是wip，则证明 wip下的children已经被处理完毕
        // 如果父级是null，则证明node是 rootFiber，并且 wip下的children已经被处理完毕
        return
      }

      // 如果父级不是wip或者rootFiber,则证明还有父级需要处理，例如此时刚处理完p, 还要递归回到div。
      node = node?.return // 这里返回父级，主要是两个目的，1. 处理父级sibling相关逻辑，2. 返回到wip终止本次children挂载流程
    }

    // 有兄弟节点时，eg:处理完span后要继续处理p
    node.sibling.return = node.return // NOTE: sibling return的关系挂载在这里
    node = node.sibling
  }
}

function bubbleProperties(wip: FiberNode) {
  // 将子节点的flags冒泡到父节点的subtreeFlags中
  let subtreeFlags = NoFlags
  let child = wip.child
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags
    subtreeFlags |= child.flags

    child.return = wip // 这行代码感觉多余了，因为return的关系分别在 beginWork的reconcileChildFibers和completeWork的appendAllChildren处理过了
    child = child.sibling
  }
  wip.subtreeFlags = subtreeFlags
}
