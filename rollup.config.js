import babel from "@rollup/plugin-babel"
import terser from "@rollup/plugin-terser"

export default {
  input: `./src/import-map-injector.ts`,
  output: {
    format: 'iife',
  },
  plugins: [
    babel({
      babelHelpers: "bundled"
    }),
    terser(),
  ]
}