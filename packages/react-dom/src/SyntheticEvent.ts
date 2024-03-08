import { Container } from 'hostConfig'
import { Props } from 'shared/ReactTypes'

export const elementPropsKey = '__props'
const validEventList = ['click']

export interface DOMElement extends Element {
  [elementPropsKey]: Props
}
type EventCallback = (e: Event) => void
interface Paths {
  capture: EventCallback[]
  bubble: EventCallback[]
}
interface SyntheticEvent extends Event {
  __stopPropagation: boolean
}

export function updateFiberProps(node: DOMElement, props: Props) {
  node[elementPropsKey] = props
}

export function initEvent(container: Container, eventType: string) {
  if (!validEventList.includes(eventType)) {
    console.warn('不支持的事件类型', eventType)
  }
  if (__DEV__) {
    console.warn('初始化事件', eventType)
  }
  container.addEventListener(eventType, e => {
    dispatchEvent(container, eventType, e)
  })
}
function dispatchEvent(container: Container, eventType: string, e: Event) {
  const targetElement = e.target as DOMElement
  if (targetElement === null) {
    console.warn('事件不存在target')
    return
  }
  // 1. 收集targetElement -> container 内所有 eventType事件的回调函数
  const paths = collectPaths(targetElement, container, eventType)

  // 2. 构造合成事件
  const syntheticEvent = createSyntheticEvent(e)

  // 3. 遍历capture
  triggerEventFlow(paths.capture, syntheticEvent)

  // 4. 遍历bubble
  if (!syntheticEvent.__stopPropagation) {
    triggerEventFlow(paths.bubble, syntheticEvent)
  }
}
function getCallbackNameFromEventType(eventType: string) {
  return {
    click: ['onClickCapture', 'onClick'],
  }[eventType]
}

function collectPaths(
  targetElement: DOMElement,
  container: Container,
  eventType: string,
) {
  const paths: Paths = {
    capture: [],
    bubble: [],
  }
  while (targetElement && targetElement !== container) {
    // 收集
    const elementProps = targetElement[elementPropsKey]
    if (elementProps) {
      // click => onClickCapture onClick
      const callbackNameList = getCallbackNameFromEventType(eventType)
      if (callbackNameList) {
        callbackNameList.forEach((callbackName, i) => {
          const eventCallback = elementProps[callbackName]
          if (eventCallback) {
            if (i === 0) {
              // 捕获
              paths.capture.unshift(eventCallback)
            } else {
              // 冒泡
              paths.bubble.push(eventCallback)
            }
          }
        })
      }
    }
    targetElement = targetElement.parentNode as DOMElement
  }
  return paths
}

function createSyntheticEvent(e: Event) {
  const syntheticEvent = e as SyntheticEvent
  syntheticEvent.__stopPropagation = false
  const originStopPropagation = e.stopPropagation || e.cancelBubble
  syntheticEvent.stopPropagation = function () {
    syntheticEvent.__stopPropagation = true
    if (originStopPropagation) {
      originStopPropagation()
    }
  }
  return syntheticEvent
}

function triggerEventFlow(
  paths: EventCallback[],
  syntheticEvent: SyntheticEvent,
) {
  for (let index = 0; index < paths.length; index++) {
    const eventCallback = paths[index]
    eventCallback.call(null, syntheticEvent)
    if (syntheticEvent.__stopPropagation) {
      break
    }
  }
}
