import currentDispatcher, {
  Dispatcher,
  resolveDispatcher,
} from './src/currentDispatcher'
import {
  jsxDEV,
  jsx,
  isValidElement as isValidElementFn,
  Fragment as FragmentType,
} from './src/jsx'

export const useState: Dispatcher['useState'] = initialState => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}
export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useEffect(create, deps)
}
// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher,
}
export const version = '0.0.0'

// 开发环境
// export const createElement = jsxDEV

// 生产环境
export const createElement = jsx

export const isValidElement = isValidElementFn

export const Fragment = FragmentType

// export default {
//   version: '0.0.0',
//   createElement: jsxDEV,
// }
