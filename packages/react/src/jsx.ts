// ReactElement
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols'
import {
  Type,
  Key,
  Ref,
  Props,
  ElementType,
  ReactElement,
} from 'shared/ReactTypes'

const ReactElement = function (
  type: Type, // 如果标签是hostComponent，type就是'div'，'p'等字符串，如果标签是functionComponent，type就是就是函数本身
  key: Key,
  ref: Ref,
  props: Props,
): ReactElement {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE, // 这里相对参数，补充了一个symbol的标志key
    type,
    key,
    ref,
    props,
    __mark: 'jeffery', // 为了和源码区分，添加一个自定义字段
  }
  return element
}

export const jsx = (type: ElementType, config: any, ...maybeChildren: any) => {
  // 特殊处理config中的 key和ref，单独从config中提出,其他放入props
  let key: Key = null
  let ref: Ref = null
  let props: Props = {}
  for (const propKey in config) {
    if (Object.prototype.hasOwnProperty.call(config, propKey)) {
      const val = config[propKey]
      if (propKey === 'key') {
        if (val !== undefined) key = '' + val
        continue
      }
      if (propKey === 'ref') {
        if (val !== undefined) ref = val
        continue
      }
      props[propKey] = val
    }
  }

  // 处理maybeChildren
  const maybeChildrenLength: number = maybeChildren?.length
  if (maybeChildrenLength) {
    // child || [child1, child2, child3]
    if (maybeChildrenLength === 1) {
      props.children = maybeChildren[0]
    } else {
      props.children = maybeChildren
    }
  }

  return ReactElement(type, key, ref, props)
}

export const jsxDEV = (type: ElementType, config: any) => {
  let key: Key = null
  let ref: Ref = null
  let props: Props = {}
  for (const propKey in config) {
    if (Object.prototype.hasOwnProperty.call(config, propKey)) {
      const val = config[propKey]
      if (propKey === 'key') {
        if (val !== undefined) key = '' + val
        continue
      }
      if (propKey === 'ref') {
        if (val !== undefined) ref = val
        continue
      }
      props[propKey] = val
    }
  }

  return ReactElement(type, key, ref, props)
}
export const Fragment = REACT_FRAGMENT_TYPE
export const isValidElement = (object: any) => {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  )
}
