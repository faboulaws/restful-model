const PATH = require('path');

const config = {
  entry: {
    entry: './lib/index.js'
  },
  output: {
    filename: 'index.js',
    path: PATH.resolve(__dirname, 'dist'),
  }, devtool: 'source-map'
};

module.exports = config;