const path = require('path');
const buildPath = path.join(__dirname, '..');

module.exports = {
  entry: {
    index: './src/index.js'
  },
  output: {
    filename: 'lib/[name].js',
    path: buildPath,
    libraryTarget: 'commonjs2'
  }
};
