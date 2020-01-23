'use strict';

import cliArgs from 'command-line-args';

export const cliArgsDictionary = [
  {
    name: 'storage-list',
    type: Boolean,
    multiple: false,
    helpText: '<storage-name>'
  },
  {
    name: 'storage',
    type: String,
    multiple: false,
    helpText: 'shows available MTP storages'
  }
];

export const cliOptions = cliArgs(cliArgsDictionary, {
  stopAtFirstUnknown: true
});
