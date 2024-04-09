import { resolvePkgPath, getPackageJson, getBaseRollupPlugins } from './utils'
import generatePkgJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

const { name, module, peerDependencies } = getPackageJson('react-noop-renderer')

const pkgPath = resolvePkgPath(name)
const pkgDistPath = resolvePkgPath(name, true)
// react,jsx,jsx-dev
export default [
  {
    input: `${pkgPath}/${module}`,
    output: [
      {
        file: `${pkgDistPath}/index.js`,
        name: 'ReactNoopRenderer',
        format: 'umd'
      },
    ],
    external: [...Object.keys(peerDependencies), 'scheduler'],
    plugins: [
      ...getBaseRollupPlugins({
        typescript: {
          tsconfigOverride: {
            exclude: ['./packages/react-dom/**/*'],
            compilerOptions: {
              paths: {
                "hostConfig": [`./${name}/src/hostConfig.ts`]
              }
            }
          }
        }
      }),
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
]