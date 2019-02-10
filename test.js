'use strict';

const MTP = require('./lib').MTP;
const findLodash = require('lodash/find');
const MTP_FLAGS = require('./lib/mtp-device-flags').FLAGS;

const mtpObj = new MTP();
mtpObj.init();

async function run(resetmtp = false, searchDir = null) {
  /**
   * Detect MTP
   */
  const {
    error: detectMtpError,
    data: detectMtpData
  } = await mtpObj.detectMtp();

  if (detectMtpError) {
    console.error(detectMtpError);
    return;
  }

  /**
   * Set Storage Devices
   */
  const {
    error: setStorageDevicesError,
    data: setStorageDevicesData
  } = await mtpObj.setStorageDevices({ deviceIndex: 0 });

  if (setStorageDevicesError) {
    console.error(setStorageDevicesError);
    return;
  }

  if (resetmtp) {
    const {
      error: listMtpFileTreeError,
      data: listMtpFileTreeData
    } = await mtpObj.listMtpFileTree({
      folderId: MTP_FLAGS.FILES_AND_FOLDERS_ROOT,
      recursive: false
    });

    if (listMtpFileTreeError) {
      console.error(listMtpFileTreeError);
      return;
    }

    if (searchDir) {
      console.error(findLodash(listMtpFileTreeData, { name: searchDir }));
      return;
    }

    console.error(listMtpFileTreeData);
    return;
  }

  /*const {
    error: listMtpFileTreeError,
    data: listMtpFileTreeData
  } = await mtpObj.listMtpFileTree({
    folderId: 34,
    recursive: true,
    parentPath: '/'
  });

  if (listMtpFileTreeError) {
    console.error(listMtpFileTreeError);
    return;
  }
  console.log(listMtpFileTreeData);*/

  const {
    error: listLocalFileTreeError,
    data: listLocalFileTreeData
  } = await mtpObj.listLocalFileTree({
    folderPath: '/Users/ganeshr/Desktop/2',
    recursive: true
  });

  if (listLocalFileTreeError) {
    console.error(listLocalFileTreeError);
    return;
  }
  console.log(listLocalFileTreeData);

  //await mtpObj.deleteFile({ fileId: 57 });
  //todo: handle error here

  /*const downloadFileTree = await mtpObj.downloadFileTree({
    nodes: listMtpFileTree,
    destinationFilePath: `~/Desktop/2`
  });
  */
  //todo: handle error here

  /*const listLocalFileTree = await mtpObj.listLocalFileTree({
    folderPath: '~/Desktop/2',
    recursive: true
  });

  const uploadFileTree = await mtpObj.uploadFileTree({
    nodes: listLocalFileTree,
    parentId: 49
  });*/
  //todo: handle error here

  /*mtpObj.renameFile({
    fileId: 49,
    newfileName: 'ABCD',
    parentId: MTP_FLAGS.FILES_AND_FOLDERS_ROOT
  });*/
  //todo: handle error here

  /**
   * Release Device
   */
  const {
    error: releaseDeviceError,
    data: releaseDeviceData
  } = await mtpObj.releaseDevice();

  if (releaseDeviceError) {
    console.error(releaseDeviceError);
  }
}

let resetmtp = false;
let searchDir = null;

process.argv.forEach((val, index, array) => {
  switch (index) {
    case 2:
      resetmtp = true;
      break;

    case 3:
      searchDir = val;
      break;

    default:
      break;
  }
});

run(resetmtp, searchDir).catch(e => {
  console.error(e);
});
