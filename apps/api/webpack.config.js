// ponytail: inline all deps so the Vercel lambda is self-contained.
// Alias @repo/* to TS source so webpack compiles workspace packages directly —
// avoiding pre-built CJS dist files that would try to require() ESM-only deps
// like kysely at runtime. externals:[] is explicit: bundle everything.
const path = require("path");

module.exports = function (options) {
  const plugins = options.plugins.filter(
    (p) => p.constructor.name !== "ForkTsCheckerWebpackPlugin"
  );
  const root = path.resolve(__dirname, "../..");
  return {
    ...options,
    externals: [],
    plugins,
    resolve: {
      ...options.resolve,
      alias: {
        "@repo/db": path.join(root, "packages/db/src/index.ts"),
        "@repo/shared": path.join(root, "packages/shared/src/index.ts"),
        "@repo/email": path.join(root, "packages/email/src/index.ts"),
        "@repo/prescription": path.join(root, "packages/prescription/src/index.ts"),
        "@repo/video": path.join(root, "packages/video/src/index.ts"),
      },
    },
    output: {
      ...options.output,
      library: {
        type: "commonjs2",
      },
    },
    optimization: {
      ...options.optimization,
      splitChunks: false,
    },
  };
};
