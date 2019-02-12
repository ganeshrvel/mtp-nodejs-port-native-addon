'use strict';

const MTP = require('./lib').MTP;
const findLodash = require('lodash/find');
const MTP_FLAGS = require('./lib/mtp-device-flags').FLAGS;

const mtpObj = new MTP();
mtpObj.init();

async function run(resetmtp = false, searchDir = null) {
  /**
   * =====================================================================
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
   * =====================================================================
   * Set Storage Devices
   */
  const {
    error: setStorageDevicesError,
    data: setStorageDevicesData
  } = await mtpObj.setStorageDevices({ storageIndex: 0 });

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

  /**
   * =====================================================================
   * List MTP File Tree
   */

  /*  const {
    error: listMtpFileTreeError,
    data: listMtpFileTreeData
  } = await mtpObj.listMtpFileTree({
    folderId: 34,
    recursive: false,
    parentPath: '/'
  });

  if (listMtpFileTreeError) {
    console.error(listMtpFileTreeError);
    return;
  }
  console.log(listMtpFileTreeData);*/

  /**
   * =====================================================================
   * List Local File Tree
   */

  /*  const {
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
  console.log(listLocalFileTreeData);*/

  /**
   * =====================================================================
   * List Delete file
   */

  /*  const {
    error: deleteFileError,
    data: deleteFileData
  } = await mtpObj.deleteFile({ fileId: 7 });

  if (deleteFileError) {
    console.error(deleteFileError);
  }*/

  /**
   * =====================================================================
   * Rename File
   */
  /*  const {
    error: renameFileError,
    data: renameFileData
  } = await mtpObj.renameFile({
    fileId: 35,
    newfileName: '_ABCD'
  });

  if (renameFileError) {
    console.error(renameFileError);
  }*/

  /**
   * =====================================================================
   * Get file info
   */

  /*  const {
    error: getFileInfoError,
    data: getFileInfoData
  } = await mtpObj.getFileInfo({ fileId: 57 });

  if (getFileInfoError) {
    console.error(getFileInfoError);
  }
  console.log(getFileInfoData.name);*/

  /**
   * =====================================================================
   * File Exists
   */

  /*  const {
    error: fileExistsError,
    data: fileExistsData
  } = await mtpObj.fileExists({
    fileName: 'Files',
    parentId: MTP_FLAGS.FILES_AND_FOLDERS_ROOT
  });

  if (fileExistsError) {
    console.error(fileExistsError);
  }
  if (fileExistsData) {
    console.log(fileExistsData.name);
  }*/

  /**
   * =====================================================================
   * Create Folder
   */
  /*
  const {
    error: createFolderError,
    data: createFolderData
  } = await mtpObj.createFolder({
    newFolderName: 'ABCD',
    parentId: MTP_FLAGS.FILES_AND_FOLDERS_ROOT
  });

  if (createFolderError) {
    console.error(createFolderError);
  }
  if (createFolderData) {
    console.log(createFolderData);
  }*/

  /**
   * =====================================================================
   * Download file tree
   */

  /*  const {
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

  const {
    error: downloadFileTreeError,
    data: downloadFileTreeData
  } = await mtpObj.downloadFileTree({
    rootNode: true,
    nodes: listMtpFileTreeData,
    destinationFilePath: `/Users/ganeshr/Desktop/3`,
    callback: ({ sent, total, file }) => {
      process.stdout.write(
        `Downloaded file: ${sent} / ${total} of ${file.name}\n`
      );
    }
  });
  if (downloadFileTreeError) {
    console.error(downloadFileTreeError);
    return;
  }

  console.log(downloadFileTreeData);*/

  /**
   * =====================================================================
   * Upload file tree
   */

  /*const {
    error: listLocalFileTreeError,
    data: listLocalFileTreeData
  } = await mtpObj.listLocalFileTree({
    folderPath: '/Users/ganeshr/Desktop/3',
    recursive: true
  });

  if (listLocalFileTreeError) {
    console.error(listLocalFileTreeError);
    return;
  }

  const {
    error: uploadFileTreeError,
    data: uploadFileTreeData
  } = await mtpObj.uploadFileTree({
    rootNode: true,
    nodes: listLocalFileTreeData,
    parentId: 45,
    callback: ({ sent, total, file }) => {
      process.stdout.write(
        `Uploaded file: ${sent} / ${total} of ${file.name}\n`
      );
    }
  });

  if (uploadFileTreeError) {
    console.error(uploadFileTreeError);
    return;
  }

  console.log(uploadFileTreeData);*/

  /**
   * =====================================================================
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
