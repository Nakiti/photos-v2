module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { 'legacy': true }],
    'react-native-reanimated/plugin',
  ],
  // Strip console.* from release/production bundles so debug logging (and any
  // PII it carries) never ships. console.error / console.warn are kept so
  // genuine error reporting still reaches device logs / crash tooling.
  // Keyed off BABEL_ENV || NODE_ENV — Metro sets this to 'production' for
  // release builds, so dev/debug builds keep all logging.
  env: {
    production: {
      plugins: [
        ['transform-remove-console', { exclude: ['error', 'warn'] }],
      ],
    },
  },
};
