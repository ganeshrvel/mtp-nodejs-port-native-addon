import { cliOptions, cliArgsDictionary } from './utils/cli';

import MTP_KERNEL from './classes/mtp-kernel';
import MTP_DEVICE_FLAGS from './constants/mtp-device-flags';
import { inArray, isArray, undefinedOrNull } from './utils/functs';
import { releaseDevice } from './device/release';

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
  const mtpObj = new MTP_KERNEL();

  mtpObj.init();

  for (let i = 0; i < cliOptionsKeysList.length; i += 1) {
    const key = cliOptionsKeysList[i];
    const value = isArray(cliOptions[key])
      ? cliOptions[key][0]
      : cliOptions[key];

    if (inArray(cliOptionsKeysList, '_unknown') || undefinedOrNull(value)) {
      console.info('Unknown argument, available options:');
      availableOptions().map(a => {
        console.info(a);
      });

      break;
    }

    // Initialize MTP Kernel

    if (key === 'storage') {
      console.log('key => ', key);
      console.log('value => ', value);
    }

    if (key === 'storage-list') {
      console.log('key => ', key);
      console.log('value => ', value);
    }
  }

  // Release the MTP device
  releaseDevice(mtpObj);
}
