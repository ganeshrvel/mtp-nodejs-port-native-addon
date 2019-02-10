'use strict';

const mtpHelper = require('./helper');
const mkdirp = require('mkdirp');
const readdir = require('recursive-readdir');
const fs = require('fs');
const path = require('path');
const junk = require('junk');
const findLodash = require('lodash/find');

function undefinedOrNull(_var) {
  return typeof _var === 'undefined' || _var === null;
}

function quickHash(str) {
  let hash = 0;
  let i;
  let chr;

  if (str.length === 0) {
    return hash;
  }
  for (i = 0; i < str.length; i += 1) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr; // eslint-disable-line no-bitwise
    hash |= 0; // eslint-disable-line no-bitwise
  }
  return hash;
}

function isWritable(folderPath) {
  try {
    fs.accessSync(folderPath, fs.R_OK | fs.W_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function isArray(n) {
  return Array.isArray(n);
}

async function promisifiedMkdir({ newFolderPath }) {
  try {
    return new Promise(resolve => {
      mkdirp(newFolderPath, error => {
        resolve({ data: null, stderr: error, error });
      });
    });
  } catch (e) {
    console.error(e);
  }
}

class MTP {
  constructor() {
    this.mtpHelper = mtpHelper;
    this.device = null;
  }

  init() {
    try {
      this.mtpHelper.Init();
    } catch (e) {
      console.error(e);
    }
  }

  detectMtp() {
    const _return = {
      error: null,
      data: {}
    };

    return new Promise(resolve => {
      return this.mtpHelper.Detect_Raw_Devices((err, rawDevices) => {
        try {
          if (err) {
            return resolve({
              ..._return,
              error: err
            });
          }

          this.device = this.mtpHelper.Open_Raw_Device_Uncached(rawDevices[0]);
          return resolve({
            ..._return,
            date: {
              device: this.device,
              modelName: this.mtpHelper.Get_Modelname(this.device),
              serialNumber: this.mtpHelper.Get_Serialnumber(this.device),
              deviceVersion: this.mtpHelper.Get_Deviceversion(this.device)
            }
          });
        } catch (e) {
          console.error(e);
          resolve({
            ..._return,
            error: e
          });
        }
      });
    });
  }

  getDevice() {
    return this.device;
  }

  getStorageDevices() {
    if (this.device === null) {
      return Promise.resolve(null);
    }

    const _return = {};

    try {
      this.mtpHelper.Get_Storage(
        this.device,
        this.mtpHelper.STORAGE_SORTBY_NOTSORTED
      );

      this.device.getStorages().forEach(storage => {
        _return[storage.id] = storage;
      });

      return Promise.resolve(_return);
    } catch (e) {
      console.error(e);
      return Promise.resolve(null);
    }
  }

  releaseDevice() {
    if (this.device === null) {
      return Promise.resolve(null);
    }

    return Promise.resolve(this.mtpHelper.Release_Device(this.device));
  }

  async fileExists({ fileName, parentId, storageId }) {
    if (this.device === null) {
      return Promise.resolve(null);
    }

    if (undefinedOrNull(fileName)) {
      return null;
    }

    const listMtpFileTree = await this.listMtpFileTree({
      storageId,
      folderId: parentId,
      recursive: false
    });

    const foundItem = findLodash(listMtpFileTree, { name: fileName });
    if (foundItem) {
      return Promise.resolve(foundItem);
    }

    return Promise.resolve(null);
  }

  deleteFile({ fileId }) {
    if (this.device === null) {
      return Promise.resolve(null);
    }

    return Promise.resolve(this.mtpHelper.Destroy_file(this.device, fileId));
  }

  createFolder({ folderPath, parentId, storageId }) {
    if (this.device === null) {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      this.mtpHelper.Create_Folder(this.device, folderPath, parentId, storageId)
    );
  }

  _listMtpFileTree({
    storageId,
    folderId,
    recursive = false,
    fileTreeStructure = [],
    parentPath = ''
  }) {
    if (this.device === null) {
      return Promise.resolve(null);
    }

    const files = this.mtpHelper.Get_Files_And_Folders(
      this.device,
      storageId,
      folderId
    );
    files.forEach(file => {
      const path = `${parentPath}/${file.name}`;
      const fileInfo = {
        id: file.id,
        name: file.name,
        size: file.size,
        isFolder: this.mtpHelper.FILETYPE_FOLDER === file.type,
        parentId: file.parentId,
        type: file.type,
        storageId: file.storageId,
        path,
        children: []
      };

      const lastIndex = fileTreeStructure.push(fileInfo) - 1;

      if (this.mtpHelper.FILETYPE_FOLDER === file.type && recursive) {
        this._listMtpFileTree({
          storageId,
          folderId: file.id,
          recursive,
          parentPath: path,
          fileTreeStructure: fileTreeStructure[lastIndex].children
        });
      }
    });

    return fileTreeStructure;
  }

  listMtpFileTree({ ...args }) {
    return Promise.resolve(this._listMtpFileTree({ ...args }));
  }

  _listLocalFileTree({
    folderPath,
    recursive = false,
    fileTreeStructure = []
  }) {
    fs.readdirSync(folderPath).forEach(file => {
      if (!junk.is(file)) {
        const fullPath = path.join(folderPath, file);
        const stats = fs.lstatSync(fullPath);
        const size = stats.size;
        const isFolder = stats.isDirectory();
        const fileInfo = {
          id: quickHash(fullPath),
          name: file,
          size,
          isFolder,
          path: fullPath,
          children: []
        };

        if (isWritable(fullPath)) {
          const lastIndex = fileTreeStructure.push(fileInfo) - 1;

          if (isFolder && recursive) {
            this._listLocalFileTree({
              folderPath: fullPath,
              recursive,
              fileTreeStructure: fileTreeStructure[lastIndex].children
            });
          }
        }
      }
    });

    return fileTreeStructure;
  }

  listLocalFileTree({ ...args }) {
    return Promise.resolve(this._listLocalFileTree({ ...args }));
  }

  downloadFile({ destinationFilePath, fileId }) {
    if (this.device === null) {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      this.mtpHelper.Get_File_To_File(
        this.device,
        fileId,
        destinationFilePath,
        (sent, total) => {
          process.stdout.write(`Downloaded file: ${sent} of ${total}`);
        }
      )
    );
  }

  async downloadFileTree({ nodes, destinationFilePath }) {
    if (this.device === null) {
      return Promise.resolve(null);
    }

    for (let i = 0; i < nodes.length; i += 1) {
      const item = nodes[i];

      if (item.isFolder) {
        const newFolderPath = `${destinationFilePath}/${item.name}`;

        const { error } = await promisifiedMkdir({
          newFolderPath
        });

        if (error) {
          console.error(`${error}`, `downloadFileTree -> mkdir error`);
          return { error, stderr: null, data: false };
        }

        await this.downloadFileTree({
          nodes: item.children,
          destinationFilePath: newFolderPath
        });

        continue;
      }

      return await this.downloadFile({
        destinationFilePath: `${destinationFilePath}/${item.name}`,
        fileId: item.id
      });
    }
  }

  uploadFile({ filePath, parentId, storageId, size }) {
    if (this.device === null) {
      return Promise.resolve(null);
    }

    const file = new this.mtpHelper.file_t();
    file.size = size;
    file.name = path.basename(filePath);
    file.type = this.mtpHelper.FILETYPE_UNKNOWN;
    file.parentId = parentId;
    file.storageId = storageId;

    return Promise.resolve(
      this.mtpHelper.Send_File_From_File(
        this.device,
        filePath,
        file,
        (sent, total) => {
          process.stdout.write(`Uploaded file: ${sent} of ${total}`);
        }
      )
    );
  }

  async uploadFileTree({ nodes, parentId, storageId }) {
    if (this.device === null) {
      return Promise.resolve(null);
    }

    for (let i = 0; i < nodes.length; i += 1) {
      const item = nodes[i];
      let newId = 0;

      if (item.isFolder) {
        newId = await this.createFolder({
          folderPath: item.name,
          parentId,
          storageId
        });

        if (newId === 0) {
          const _folderExists = await this.fileExists({
            fileName: path.basename(item.name),
            parentId,
            storageId
          });

          if (
            undefinedOrNull(_folderExists) ||
            undefinedOrNull(_folderExists.id)
          ) {
            return Promise.resolve(null); // todo: error
          }

          newId = _folderExists.id;
        }

        await this.uploadFileTree({
          nodes: item.children,
          parentId: newId,
          storageId
        });

        continue;
      }

      const _fileExists = await this.fileExists({
        fileName: path.basename(item.name),
        parentId,
        storageId
      });

      if (_fileExists) {
        this.deleteFile({ fileId: _fileExists.id });
      }

      await this.uploadFile({
        filePath: item.path,
        parentId,
        storageId,
        size: item.size
      });
    }
  }
}

const mtpObj = new MTP();
const storageId = 65537;
mtpObj.init();

async function run(resetmtp = false, searchDir = null) {
  const detectedDevices = await mtpObj.detectMtp();
  //todo: handle error here
  const getStorageDevices = await mtpObj.getStorageDevices();
  //todo: handle error here

  if (resetmtp) {
    const listMtpFileTree = await mtpObj.listMtpFileTree({
      storageId: storageId,
      folderId: mtpHelper.FILES_AND_FOLDERS_ROOT,
      recursive: false
    });

    if (searchDir) {
      console.log(findLodash(listMtpFileTree, { name: searchDir }));
      return;
    }

    console.log(listMtpFileTree);
    return;
  }

  const parentPath = '/aak';

  const listMtpFileTree = await mtpObj.listMtpFileTree({
    storageId: storageId, //todo: change
    folderId: 49,
    recursive: true,
    parentPath: parentPath
  });

  // console.log(listMtpFileTree);
  //todo: handle error here

  //mtpObj.deleteFile({ fileId: 46 });
  //todo: handle error here

  console.log(
    await mtpObj.downloadFileTree({
      nodes: listMtpFileTree,
      destinationFilePath: `/Users/ganeshr/Desktop/2`
    })
  );
  //todo: handle error here

  /*  const listLocalFileTree = await mtpObj.listLocalFileTree({
    folderPath: '/Users/ganeshr/Desktop/2',
    recursive: true
  });*/

  /*  await mtpObj.uploadFileTree({
    nodes: listLocalFileTree,
    parentId: 49,
    storageId: storageId //todo: change
  });*/
  //todo: handle error here

  // console.log(mtpObj.pathToId('/WhatsApp'));

  const releaseDevice = await mtpObj.releaseDevice();
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

module.exports.MTP = MTP;
