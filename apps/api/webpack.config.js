// ponytail: inline all deps so the Vercel lambda is self-contained.
// Use output.library.type (webpack 5 API) — libraryTarget alias is not applied
// by NestJS CLI's config merge. splitChunks:false avoids dynamic chunk loading
// issues in the lambda environment; every module ends up in the single bundle.
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
