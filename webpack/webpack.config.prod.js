const path = require('path');
const fs = require('fs');
const buildPath = path.join(__dirname, '..');

const nodeModules = {};

fs.readdirSync('node_modules')
  .filter(x => ['.bin'].indexOf(x) === -1)
  .forEach(mod => (nodeModules[mod] = 'commonjs ' + mod));

module.exports = {
  entry: {
    index: ['./src/index.js']
  },
  output: {
    filename: 'dist/[name].js',
    path: buildPath
  },
  node: {
    __dirname: false,
    __filename: false,
    fs: 'empty'
  },
  externals: [nodeModules],
  resolve: {
    extensions: ['.js', '.node']
  }
};
