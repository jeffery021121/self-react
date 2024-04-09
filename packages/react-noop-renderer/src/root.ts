import {
  createContainer,
  updateContainer,
} from 'react-reconciler/src/fiberReconciler'
import { Container, Instance } from './hostConfig'
import { ReactElement } from 'shared/ReactTypes'
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols'
import * as _Scheduler from 'scheduler'

let idCounter = 0

function getChildren(parent: Container | Instance) {
  if (parent) return parent.children
  return null
}

function getChildrenAsJSX(container: Container) {
  const children = childToJsx(getChildren(container))
  if (!Array.isArray(children)) return children
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    props: { children },
    key: null,
    ref: null,
    type: REACT_FRAGMENT_TYPE,
    __mark: 'jeffery',
  }
}

function childToJsx(child: any): any {
  // 文本节点的具体文本内容，感觉不会出现这个情况啊。源代码是使用的双参数，不过也有一个string的判断
  // 源代码https://github.com/Colt/tags-demo/blob/d83634c58c1ce0bc563f625b24cda23355768044/packages/react-noop-renderer/src/createReactNoop.js#L598
  if (typeof child === 'string' || typeof child === 'number') return child

  // 数组
  if (Array.isArray(child)) {
    if (child.length === 0) return null
    if (child.length === 1) return childToJsx(child[0])
    const children = child.map(childToJsx)
    // 如果全是字符串或者数字，拼接成一个大的字符串
    if (
      children.every(
        child => typeof child === 'string' || typeof child === 'number',
      )
    ) {
      return children.join('')
    }
    return children
  }

  // Instance
  if (Array.isArray(child.children)) {
    const instance: Instance = child
    const children = childToJsx(instance.children)
    const props = instance.props
    if (children !== null) {
      props.children = children
    }
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      props,
      key: null,
      ref: null,
      type: instance.type,
      __mark: 'jeffery',
    }
  }
  // TextInstance
  return child.text
}
export function createRoot() {
  let container: Container = {
    rootID: idCounter++,
    children: [],
  }
  // @ts-ignore
  const root = createContainer(container)

  return {
    render(element: ReactElement) {
      return updateContainer(element, root)
    },
    getChildren() {
      return getChildren(container)
    },
    getChildrenAsJSX() {
      return getChildrenAsJSX(container)
    },
    _Scheduler,
  }
}
