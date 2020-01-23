import path from 'path';

const nbind = require('nbind');
const libPath = path.resolve(__dirname, '..', '..', 'build');
const lib = nbind.init(libPath).lib;

export const mtpNativeModule = lib;
