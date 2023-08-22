import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";

export default {
  input: `./src/import-map-injector.ts`,
  output: {
    format: "iife",
    dir: "lib",
    sourcemap: true,
  },
  plugins: [
    babel({
      babelHelpers: "bundled",
      extensions: [".js", ".jsx", ".mjs", ".ts", ".tsx"],
    }),
    terser(),
  ],
};
