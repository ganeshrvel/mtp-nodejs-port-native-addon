const nbind = require('nbind');
const path = require('path');
const lib = nbind.init(path.resolve(__dirname, '..', 'build/Release')).lib;
const mtpHelper = (exports = module.exports = lib);
