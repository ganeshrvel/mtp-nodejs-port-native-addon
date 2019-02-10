const mtp = require('.');
const fs = require('fs');
const path = require('path');

function undefinedOrNull(_var) {
  return typeof _var === 'undefined' || _var === null;
}

function getStorageDevices(device) {
  mtp.Get_Storage(device, mtp.STORAGE_SORTBY_NOTSORTED);
  return new Promise(resolve => {
    device.getStorages().forEach(storage => {
      return resolve(storage);
    });
  });
}

function sendFile(device, filePath, parentId, storageId) {
  const stats = fs.statSync(filePath);

  const file = new mtp.file_t();
  file.size = stats.size;
  file.name = path.basename(filePath);
  file.type = mtp.FILETYPE_UNKNOWN;
  file.parentId = parentId;
  file.storageId = storageId;

  const _return = mtp.Send_File_From_File(
    device,
    filePath,
    file,
    (sent, total) => {
      process.stdout.write(`Uploaded file: ${sent} of ${total}`);
    }
  );
  console.log('Uploaded file return code => ', _return);
}

function getFile(device, destinationFilePath, fileId) {
  const _return = mtp.Get_File_To_File(
    device,
    fileId,
    destinationFilePath,
    (sent, total) => {
      process.stdout.write(`Downloaded file: ${sent} of ${total}`);
    }
  );
  console.log('Uploaded file return code => ', _return);
}

function createFolder(device, folderPath, parentID, storageId) {
  const _return = mtp.Create_Folder(device, folderPath, parentID, storageId);

  console.log(_return);
}

function renameFile(device, fileId, filePath) {
  const file = new mtp.file_t();
  file.id = fileId;
  mtp.Set_File_Name(device, file, path.basename(filePath));
}

function deleteFile(device, fileId) {
  mtp.Destroy_file(device, fileId);
}

function fileTree({
  device,
  storageId,
  folderId,
  recursive = false,
  isRootNode,
  fileTreeStructure = [],
  parentPath = '/'
}) {
  const files = mtp.Get_Files_And_Folders(device, storageId, folderId);
  files.forEach(file => {
    const path = `${parentPath}/${file.name}`;
    const fileInfo = {
      id: file.id,
      name: file.name,
      size: file.size,
      isFolder: mtp.FILETYPE_FOLDER === file.type,
      parentId: file.parentId,
      type: file.type,
      storageId: file.storageId,
      path,
      children: []
    };

    const lastIndex = fileTreeStructure.push(fileInfo) - 1;

    if (mtp.FILETYPE_FOLDER === file.type && recursive) {
      fileTree({
        device,
        storageId,
        folderId: file.id,
        recursive,
        isRootNode: false,
        parentPath,
        fileTreeStructure: fileTreeStructure[lastIndex].children
      });
    }
  });

  return fileTreeStructure;
}

mtp.Init();

mtp.Detect_Raw_Devices((err, rawDevices) => {
  if (err) {
    console.log(`MTP fetch exited with an error code => ${err}`);
    return;
  }

  try {
    rawDevices.forEach(rawDevice => {
      const device = mtp.Open_Raw_Device_Uncached(rawDevice);

      console.log('Model Name: ', mtp.Get_Modelname(device));
      console.log('Serial: ', mtp.Get_Serialnumber(device));
      console.log('version: ', mtp.Get_Deviceversion(device));

      getStorageDevices(device).then(storage => {
        console.log('Available Storages: ', storage.description);

        /*
         * Connect your phone in MTP mode
         * Uncomment the below lines
         * Run this file
         *
         * replace handle parentId appropriately. mtp.FILES_AND_FOLDERS_ROOT = root path
         * */

        // sendFile(device, storage.id, mtp.FILES_AND_FOLDERS_ROOT, '', false);

        // getFile(device, '/test.txt', <file-id>)
        /*
        console.log(
          fileTree({
            device,
            storageId: storage.id,
            folderId: mtp.FILES_AND_FOLDERS_ROOT,
            recursive: false,
            isRootNode: true
          })
        ); */

        const _file = fileTree({
          device,
          storageId: storage.id,
          folderId: 45, // mtp.FILES_AND_FOLDERS_ROOT, // 54, //54, mtp.FILES_AND_FOLDERS_ROOT, //
          recursive: true,
          isRootNode: true,
          parentPath: '/A'
        });

        //console.log(_file);
        console.log(JSON.stringify(_file));
        //  console.log(fileTree(device, storage.id, 42, true, {}));

        /*        createFolder(
          device,
          '/test-folder',
          mtp.FILES_AND_FOLDERS_ROOT,
          storage.id
        );*/

        // renameFile(device, <file-id>, '/test.txt');

        // deleteFile(deleteFile, <file-id>);

        mtp.Release_Device(device);
      });
    }, this);
  } catch (error) {
    console.error(error);
  }
});
