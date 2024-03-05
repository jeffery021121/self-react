import { resolvePkgPath, getPackageJson, getBaseRollupPlugins } from './utils'
import generatePkgJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

const { name, module, peerDependencies } = getPackageJson('react-dom')

const pkgPath = resolvePkgPath(name)
const pkgDistPath = resolvePkgPath(name, true)
// react,jsx,jsx-dev
export default [
  {
    // react-dom
    input: `${pkgPath}/${module}`,
    output: [
      {
        file: `${pkgDistPath}/index.js`,
        name: 'ReactDOM', // 这个name字段，是给umd时 window全局调用的 -》 window.ReactDom就会找到该文件
        format: 'umd'
      },
      {
        file: `${pkgDistPath}/client.js`,
        name: 'client',
        format: 'umd'
      }
    ],
    external: [...Object.keys(peerDependencies)],
    plugins: [
      ...getBaseRollupPlugins(),
      // webpack resolve alias
      alias({
        entries: {
          hostConfig: `${pkgPath}/src/hostConfig.ts`
        }
      }),
      generatePkgJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: ({ name, description, version }) => ({
          name,
          description,
          peerDependencies: {
            react: version
          },
          version,
          main: 'index.js'
        })
      })],
  },
  {
    // react-test-utils
    input: `${pkgPath}/test-utils.ts`,
    output: [
      {
        file: `${pkgDistPath}/test-utils.js`,
        name: 'testUtils', // 这个name字段，是给umd时 window全局调用的 -》 window[name] 就会找到该文件
        format: 'umd'
      },
    ],
    external: ['react', 'react-dom'],
    plugins: getBaseRollupPlugins()
  }
]