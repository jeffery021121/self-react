import { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'
import { Props } from 'shared/ReactTypes'

export interface Container {
  rootID: number
  children: (TextInstance | Instance)[]
}
export interface Instance {
  id: number
  type: string
  children: (TextInstance | Instance)[]
  parent: number
  props: Props
}

export interface TextInstance {
  text: string
  id: number
  parent: number
}

let instanceCounter = 0
export function createInstance(type: string, props: any): Instance {
  const instance = {
    id: instanceCounter++,
    type,
    children: [],
    parent: -1,
    props,
  }
  return instance
}

export function createTextInstance(content: string) {
  const instance = {
    id: instanceCounter++,
    parent: -1,
    text: content,
  }
  return instance
}

export function appendInitialChild(
  parent: Instance | Container,
  child: Instance,
) {
  const prevParentId = child.parent
  const parentId = 'rootID' in parent ? parent.rootID : parent.id
  if (prevParentId !== -1 && prevParentId !== parentId) {
    throw new Error('不能重复挂载child')
  }
  child.parent = parentId
  parent.children.push(child)
}

export function appendChildToContainer(
  parent: Container,
  child: Instance | TextInstance,
) {
  const prevParentId = child.parent
  const parentId = parent.rootID
  if (prevParentId !== -1 && prevParentId !== parentId) {
    throw new Error('不能重复挂载child')
  }
  child.parent = parentId
  parent.children.push(child)
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
  textInstance.text = content
}

export function removeChild(
  child: Instance | TextInstance,
  container: Container,
) {
  const index = container.children.indexOf(child)
  if (index === -1) {
    throw new Error('child不存在')
  }
  container.children.splice(index, 1)
}

export function insertChildToContainer(
  child: Instance,
  container: Container,
  before: Instance,
) {
  removeChild(child, container)
  const index = container.children.indexOf(before)
  if (index === -1) {
    throw new Error('before不存在')
  }
  container.children.splice(index, 0, child)
}

export const scheduleMicroTask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : typeof Promise === 'function'
    ? (callback: (...args: any[]) => void) => Promise.resolve().then(callback)
    : setTimeout
