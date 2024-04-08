export const HookHasEffect = 0b0001 // 本次更新需要执行副作用函数 一般 hook.tag = Passive | HookHasEffect

export const Passive = 0b0010 // effect副作用的标识，并不一定需要执行相关函数
// export const Layout =  0b00100 // layoutEffect
