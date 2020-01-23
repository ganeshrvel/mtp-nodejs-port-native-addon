import { cliOptions, cliArgsDictionary } from './utils/cli';

import MTP_KERNEL from './classes/mtp-kernel';
import MTP_DEVICE_FLAGS from './constants/mtp-device-flags';
import { inArray } from './utils/functs';

const cliOptionsKeysList = Object.keys(cliOptions);

function availableOptions() {
  return Object.keys(cliArgsDictionary).map(key => {
    const item = cliArgsDictionary[key];

    return `${item.name} -> ${item.helpText}`;
  });
}

if (!cliOptionsKeysList || cliOptionsKeysList.length < 1) {
  console.info('Available options:');

  availableOptions().map(a => {
    console.info(a);
  });
} else {
  for (let i = 0; i < cliOptionsKeysList.length; i += 1) {
    const key = cliOptionsKeysList[i];
    const value = cliOptions[key];
    const arg = value[0] ?? null;

    if (inArray(['_unknown'], key) || inArray(['_unknown', null], arg)) {
      console.info('Unknown argument, available options:');
      availableOptions().map(a => {
        console.info(a);
      });

      break;
    }

    if (inArray(['storage'], arg)) {
      console.log('storage');
    }

    if (inArray(['storage-list'], arg)) {
      console.log('storage-list');
    }
  }
}
