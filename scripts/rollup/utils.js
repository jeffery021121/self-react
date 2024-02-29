import fs from 'fs'
import path from 'path'
import ts from 'rollup-plugin-typescript2'
import cjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'


const pkgPath = path.resolve(__dirname, '../../packages')
const distPath = path.resolve(__dirname, '../../dist/node_modules')

// 解析包路径（可能是入口，也可能是出口）
export function resolvePkgPath(pkgName, isDist) {
  const resolvedPath = isDist ? distPath : pkgPath
  return `${resolvedPath}/${pkgName}`
}


// 获取package.json
export function getPackageJson(pkgName) {
  const pkgPath = resolvePkgPath(pkgName)
  const str = fs.readFileSync(`${pkgPath}/package.json`, {
    encoding: 'utf-8'
  })
  return JSON.parse(str)
}

export function getBaseRollupPlugins({ typescript = {}, alias = {
  __DEV__: true,
  preventAssignment: true
} } = {}) {
  return [replace(alias), cjs(), ts(typescript)]
}