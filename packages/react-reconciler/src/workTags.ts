// fiberNode对应的节点类型
export type WorkTag =
  | typeof FunctionComponent
  | typeof HostRoot
  | typeof HostComponent
  | typeof HostText

export const FunctionComponent = 0 // 函数式组件，类组件 对应的标志
export const HostRoot = 3 // 根元素对应的标志,一般就是值那个 #app
export const HostComponent = 5 // div,span,p等标签对应的标志
export const HostText = 6 // 文本节点对应的标志
