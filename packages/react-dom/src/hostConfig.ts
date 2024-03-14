import { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'
import { DOMElement, updateFiberProps } from './SyntheticEvent'

export type Container = Element
export type Instance = Element
export type TextInstance = Text

export function createInstance(type: string, props: any): DOMElement {
  // TODO: 处理props
  const element = document.createElement(type) as unknown as DOMElement
  updateFiberProps(element, props)

  return element
}

export function appendInitialChild(
  parent: Instance | Container,
  child: Instance,
) {
  parent.appendChild(child)
}

export function createTextInstance(content: string) {
  return document.createTextNode(content)
}
export function commitUpdate(fiber: FiberNode) {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps.content
      return commitTextUpdate(fiber.stateNode, text)

    default:
      if (__DEV__) {
        console.warn('未实现的update类型', fiber)
      }
      break
  }
}
export function commitTextUpdate(textInstance: TextInstance, content: string) {
  textInstance.textContent = content
}
export function removeChild(
  child: Instance | TextInstance,
  container: Container,
) {
  container.removeChild(child)
}

export function insertChildToContainer(
  child: Instance,
  container: Container,
  before: Instance,
) {
  container.insertBefore(child, before)
}
export const appendChildToContainer = appendInitialChild
