// ponytail: inline all JS deps so dist/serverless.js is self-contained on Vercel.
// Type checking is skipped here — handled by the separate `typecheck` step in CI.
module.exports = function (options) {
  const plugins = options.plugins.filter(
    (p) => p.constructor.name !== "ForkTsCheckerWebpackPlugin"
  );
  return {
    ...options,
    externals: {},
    plugins,
  };
};
