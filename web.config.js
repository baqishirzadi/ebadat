/**
 * Web configuration for Expo Router
 * Helps with web compatibility
 */

module.exports = {
  // Web-specific configurations
  resolve: {
    fallback: {
      // Polyfills for Node.js modules that don't work in browser
      "crypto": false,
      "stream": false,
      "buffer": false,
    },
  },
};
