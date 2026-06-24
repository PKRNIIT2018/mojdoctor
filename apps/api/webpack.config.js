// ponytail: inline all deps so the Vercel lambda is self-contained.
// Alias @repo/* to TS source so webpack compiles workspace packages directly —
// avoiding pre-built CJS dist files that would try to require() ESM-only deps
// like kysely at runtime. externals:[] is explicit: bundle everything.
// transpileOnly:true on ts-loader skips rootDir validation (TS6059) since
// packages/* are outside apps/api/src; type checking is a separate CI step.
const path = require("path");

module.exports = function (options) {
  const plugins = options.plugins.filter(
    (p) => p.constructor.name !== "ForkTsCheckerWebpackPlugin"
  );
  const root = path.resolve(__dirname, "../..");

  const rules = (options.module?.rules ?? []).map((rule) => {
    const loader = rule.loader ?? (typeof rule.use === "string" ? rule.use : rule.use?.loader);
    if (loader === "ts-loader") {
      return { ...rule, use: { loader: "ts-loader", options: { transpileOnly: true } } };
    }
    return rule;
  });

  return {
    ...options,
    externals: [],
    plugins,
    module: { ...options.module, rules },
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
