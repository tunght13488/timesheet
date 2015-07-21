'use strict';

module.exports = {
  entry: {
    report: './app/scripts/report.js'
  },
  output: {
    path: __dirname + '/app',
    publicPath: 'dist/',
    filename: '[name].js',
    chunkFilename: '[chunkhash].js'
  },
  module: {
    loaders: [
      { test: /\.json$/, loader: 'json-loader' }
    ]
  }
};
