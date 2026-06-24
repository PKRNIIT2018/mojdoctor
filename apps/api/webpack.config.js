// ponytail: inline all deps, export createServer via commonjs2 so the Vercel
// handler can require() the bundle and call createServer().
// Type checking is skipped — handled by the separate typecheck step in CI.
module.exports = function (options) {
  const plugins = options.plugins.filter(
    (p) => p.constructor.name !== "ForkTsCheckerWebpackPlugin"
  );
  return {
    ...options,
    externals: {},
    plugins,
    output: {
      ...options.output,
      libraryTarget: "commonjs2",
    },
  };
};
