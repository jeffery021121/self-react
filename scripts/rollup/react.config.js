import { resolvePkgPath, getPackageJson, getBaseRollupPlugins } from './utils'
import generatePkgJson from 'rollup-plugin-generate-package-json'

const { name, module } = getPackageJson('react')

const pkgPath = resolvePkgPath(name)
const pkgDistPath = resolvePkgPath(name, true)
// react,jsx,jsx-dev
export default [
  // react
  {
    input: `${pkgPath}/${module}`,
    output: {
      file: `${pkgDistPath}/index.js`,
      name: 'React',
      format: 'umd'
    },
    plugins: [...getBaseRollupPlugins(), generatePkgJson({
      inputFolder: pkgPath,
      outputFolder: pkgDistPath,
      baseContents: ({ name, description, version }) => ({
        name,
        description,
        version,
        main: 'index.js'
      })
    })],
  },
  {
    input: `${pkgPath}/src/jsx.ts`,
    output: [{ // jsx-runtime
      file: `${pkgDistPath}/jsx-runtime.js`,
      name: 'jsx-runtime',
      format: 'umd'
    },
    { // jsx-dev-runtime
      file: `${pkgDistPath}/jsx-dev-runtime.js`,
      name: 'jsx-dev-runtime',
      format: 'umd'
    }
    ],
    plugins: getBaseRollupPlugins()
  }
]