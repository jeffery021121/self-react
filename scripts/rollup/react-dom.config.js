import { resolvePkgPath, getPackageJson, getBaseRollupPlugins } from './utils'
import generatePkgJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

const { name, module } = getPackageJson('react-dom')

const pkgPath = resolvePkgPath(name)
const pkgDistPath = resolvePkgPath(name, true)
// react,jsx,jsx-dev
export default [
  // react-dom
  {
    input: `${pkgPath}/${module}`,
    output: [
      {
        file: `${pkgDistPath}/index.js`,
        name: 'index.js',
        format: 'umd'
      },
      {
        file: `${pkgDistPath}/client.js`,
        name: 'client.js',
        format: 'umd'
      }
    ],
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
  }
]