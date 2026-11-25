const { metrics } = require("./performance-budgets.json");

module.exports = {
  ci: {
    collect: {
      url: "http://127.0.0.1:3000/terms",
      numberOfRuns: 3,
      startServerCommand: "node .next/standalone/server.js",
      startServerReadyPattern: "Ready",
      startServerReadyTimeout: 120000,
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.8, aggregationMethod: "median" }],
        "largest-contentful-paint": [
          "error",
          { maxNumericValue: metrics.labLcpMilliseconds, aggregationMethod: "median" },
        ],
        "cumulative-layout-shift": [
          "error",
          { maxNumericValue: metrics.cls, aggregationMethod: "median" },
        ],
        "total-blocking-time": [
          "error",
          {
            maxNumericValue: metrics.totalBlockingTimeMilliseconds,
            aggregationMethod: "median",
          },
        ],
      },
    },
  },
  settings: {
    preset: "desktop",
  },
};
