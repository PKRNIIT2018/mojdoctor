const nextEslint = require("eslint-config-next");

module.exports = [
  ...nextEslint,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
