const nbind = require('nbind');
const bluebird = require('bluebird');
const path = require('path');
const lib = nbind.init(path.resolve(__dirname, '..', 'build')).lib;
module.exports = (exports = module.exports = lib);
