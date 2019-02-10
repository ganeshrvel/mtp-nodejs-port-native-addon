'use strict';

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const junk = require('junk');
const findLodash = require('lodash/find');
const mtpHelper = require('./mtp-helper');
const MTP_FLAGS = require('./mtp-device-flags').FLAGS;

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

/**
 * MTP Class
 */

class MTP {
  constructor() {
    this.mtpHelper = mtpHelper;
    this.device = null;
    this.storageId = null;

    this.ERR = {
      NO_MTP: `No MTP device found`,
      NO_STORAGE: `MTP storage not accessible`,
      LOCAL_FOLDER_NOT_FOUND: `Source folder not found`,
      RENAME_FAILED: `Some error occured while renaming`,
      FILE_INFO_FAILED: `Some error occured while fetching the file information`,
      DOWNLOAD_FILE_FAILED: `Some error occured while transfering files from MTP device`,
      UPLOAD_FILE_FAILED: `Some error occured while transfering files to MTP device`,
      NO_FILES_COPIED: `No files were transfering. Refresh your MTP`,
      CREATE_FOLDER_FAILED: `Some error occured while creating a new folder`,
      CREATE_FOLDER_FILE_FAILED: `A file with a similar name exists`
    };
  }

  init() {
    try {
      this.mtpHelper.Init();
    } catch (e) {
      console.error(`MTP -> init`, e);
    }
  }

  detectMtp() {
    let error = null;

    return new Promise(resolve => {
      return this.mtpHelper.Detect_Raw_Devices((err, rawDevices) => {
        try {
          if (err) {
            switch (err) {
              case 5:
              default:
                error = this.ERR.NO_MTP;
                break;
            }

            this.device = null;

            return resolve({
              data: null,
              error: error
            });
          }

          this.device = this.mtpHelper.Open_Raw_Device_Uncached(rawDevices[0]);

          if (undefinedOrNull(this.device)) {
            return resolve({
              data: null,
              error: this.ERR.NO_MTP
            });
          }

          return resolve({
            error: null,
            data: {
              device: this.device,
              modelName: this.mtpHelper.Get_Modelname(this.device),
              serialNumber: this.mtpHelper.Get_Serialnumber(this.device),
              deviceVersion: this.mtpHelper.Get_Deviceversion(this.device)
            }
          });
        } catch (e) {
          console.error(`MTP -> detectMtp`, e);

          return resolve({
            data: null,
            error: e
          });
        }
      });
    });
  }

  throwMtpError() {
    return Promise.resolve({
      data: null,
      error: this.ERR.NO_MTP
    });
  }

  getDevice() {
    return this.device;
  }

  getStorageId() {
    return this.storageId;
  }

  listStorageDevices() {
    if (!this.device) return this.throwMtpError();

    const storageData = {};

    try {
      this.mtpHelper.Get_Storage(
        this.device,
        MTP_FLAGS.STORAGE_SORTBY_NOTSORTED
      );

      const storageList = this.device.getStorages();

      if (undefinedOrNull(storageList) || !isArray(storageList)) {
        return Promise.resolve({
          data: null,
          error: this.ERR.NO_STORAGE
        });
      }

      storageList.forEach(storage => {
        storageData[storage.id] = storage;
      });

      return Promise.resolve({
        data: storageData,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> detectMtp`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  async setStorageDevices({ deviceIndex = 0 }) {
    if (!this.device) return this.throwMtpError();

    const listStorageDevices = await this.listStorageDevices();

    try {
      if (undefinedOrNull(listStorageDevices)) {
        return Promise.resolve({
          data: null,
          error: this.ERR.NO_STORAGE
        });
      }

      const _listStorageDevices = Object.keys(listStorageDevices)[deviceIndex];

      this.storageId = !undefinedOrNull(_listStorageDevices)
        ? _listStorageDevices
        : Object.keys(listStorageDevices)[0];

      return Promise.resolve({
        data: this.storageId,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> setStorageDevices`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  releaseDevice() {
    if (!this.device) return this.throwMtpError();

    try {
      this.mtpHelper.Release_Device(this.device);
      this.device = null;
      return Promise.resolve({
        data: true,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> releaseDevice`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  getFileInfo({ fileId }) {
    if (!this.device) return this.throwMtpError();

    try {
      const fileInfo = this.mtpHelper.Get_Filemetadata(this.device, fileId);

      if (undefinedOrNull(fileInfo) || undefinedOrNull(fileInfo.name)) {
        return Promise.resolve({
          data: null,
          error: this.ERR.FILE_INFO_FAILED
        });
      }

      return Promise.resolve({
        data: fileInfo,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> getFileInfo`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  async fileExists({ fileName, parentId }) {
    if (!this.device) return this.throwMtpError();

    try {
      const {
        error: listMtpFileTreeError,
        data: listMtpFileTreeData
      } = await this.listMtpFileTree({
        folderId: parentId,
        recursive: false
      });

      if (listMtpFileTreeError) {
        return Promise.resolve({
          data: null,
          error: listMtpFileTreeError
        });
      }

      const foundItem = findLodash(listMtpFileTreeData, { name: fileName });
      if (!foundItem) {
        return Promise.resolve({
          data: false,
          error: null
        });
      }

      return Promise.resolve({
        data: foundItem,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> fileExists`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  deleteFile({ fileId }) {
    if (!this.device) return this.throwMtpError();

    try {
      this.mtpHelper.Destroy_file(this.device, fileId);

      return Promise.resolve({
        data: true,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> deleteFile`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  async renameFile({ fileId, currentFileName, newfileName }) {
    if (!this.device) return this.throwMtpError();

    try {
      const file = new this.mtpHelper.file_t();
      file.id = fileId;
      file.storageId = this.storageId;

      const renamed = this.mtpHelper.Set_File_Name(
        this.device,
        file,
        newfileName
      );

      if (renamed !== 0) {
        const {
          error: getFileInfoError,
          data: getFileInfoData
        } = await this.getFileInfo({ fileId });

        if (!getFileInfoError && getFileInfoData.name !== newfileName) {
          return Promise.resolve({
            data: null,
            error: this.ERR.RENAME_FAILED
          });
        }
      }

      return Promise.resolve({
        data: true,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> renameFile`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  async createFolder({ newFolderName, parentId }) {
    if (!this.device) return this.throwMtpError();

    try {
      const createdFolder = this.mtpHelper.Create_Folder(
        this.device,
        newFolderName,
        parentId,
        this.storageId
      );

      if (createdFolder === 0) {
        const {
          error: fileExistsError,
          data: fileExistsData
        } = await this.fileExists({
          fileName: newFolderName,
          parentId
        });

        if (fileExistsError) {
          return Promise.resolve({
            data: null,
            error: fileExistsError
          });
        }

        if (
          undefinedOrNull(fileExistsData) ||
          undefinedOrNull(fileExistsData.id)
        ) {
          return Promise.resolve({
            data: null,
            error: this.ERR.CREATE_FOLDER_FAILED
          });
        }

        if (!fileExistsData.isFolder) {
          return Promise.resolve({
            data: null,
            error: this.ERR.CREATE_FOLDER_FILE_FAILED
          });
        }

        return Promise.resolve({
          data: fileExistsData.id,
          error: null
        });
      }

      return Promise.resolve({
        data: createdFolder,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> createFolder`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  async listMtpFileTree({
    folderId,
    recursive = false,
    fileTreeStructure = [],
    parentPath = ''
  }) {
    if (!this.device) return this.throwMtpError();

    try {
      const files = this.mtpHelper.Get_Files_And_Folders(
        this.device,
        this.storageId,
        folderId
      );

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const fullPath = path.join(parentPath, file.name);
        const fileInfo = {
          id: file.id,
          name: file.name,
          size: file.size,
          isFolder: MTP_FLAGS.FILETYPE_FOLDER === file.type,
          parentId: file.parentId,
          type: file.type,
          storageId: file.storageId,
          path: fullPath,
          children: []
        };

        const lastIndex = fileTreeStructure.push(fileInfo) - 1;

        if (MTP_FLAGS.FILETYPE_FOLDER === file.type && recursive) {
          await this.listMtpFileTree({
            folderId: file.id,
            recursive,
            parentPath: fullPath,
            fileTreeStructure: fileTreeStructure[lastIndex].children
          });
        }
      }

      return Promise.resolve({
        data: fileTreeStructure,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> listMtpFileTree`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  async listLocalFileTree({
    folderPath,
    recursive = false,
    fileTreeStructure = []
  }) {
    if (!this.device) return this.throwMtpError();

    try {
      if (!fs.existsSync(folderPath)) {
        return Promise.resolve({
          data: null,
          error: this.ERR.LOCAL_FOLDER_NOT_FOUND
        });
      }

      const files = fs.readdirSync(folderPath);
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];

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
              await this.listLocalFileTree({
                folderPath: fullPath,
                recursive,
                fileTreeStructure: fileTreeStructure[lastIndex].children
              });
            }
          }
        }
      }

      return Promise.resolve({
        data: fileTreeStructure,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> listLocalFileTree`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  downloadFile({ destinationFilePath, file, callback }) {
    if (!this.device) return this.throwMtpError();

    try {
      const downloadedFile = this.mtpHelper.Get_File_To_File(
        this.device,
        file.id,
        destinationFilePath,
        (sent, total) => {
          if (typeof callback === 'function') {
            callback({ sent, total, file });
          }
        }
      );

      if (downloadedFile !== 0) {
        return Promise.resolve({
          data: null,
          error: this.ERR.DOWNLOAD_FILE_FAILED
        });
      }

      return Promise.resolve({
        data: downloadedFile,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> downloadFile`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  async downloadFileTree({
    rootNode = false,
    nodes,
    destinationFilePath,
    callback
  }) {
    if (!this.device) return this.throwMtpError();

    try {
      if (rootNode && nodes.length < 1) {
        return Promise.resolve({
          data: null,
          error: this.ERR.NO_FILES_COPIED
        });
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const item = nodes[i];
        const localFilePath = path.join(destinationFilePath, item.name);

        if (item.isFolder) {
          const { error: promisifiedMkdirError } = await promisifiedMkdir({
            newFolderPath: localFilePath
          });

          if (promisifiedMkdirError) {
            return Promise.resolve({
              data: null,
              error: promisifiedMkdirError
            });
          }

          const {
            error: downloadFileTreeError,
            data: downloadFileTreeData
          } = await this.downloadFileTree({
            nodes: item.children,
            destinationFilePath: localFilePath,
            callback
          });

          if (downloadFileTreeError) {
            return Promise.resolve({
              data: null,
              error: downloadFileTreeError
            });
          }
          continue;
        }

        const {
          error: downloadedFileError,
          data: downloadedFileData
        } = await this.downloadFile({
          destinationFilePath: localFilePath,
          file: item,
          callback
        });

        if (downloadedFileError) {
          return Promise.resolve({
            data: null,
            error: downloadedFileError
          });
        }
      }

      return Promise.resolve({
        data: true,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> downloadFileTree`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  uploadFile({ filePath, parentId, size, callback }) {
    if (!this.device) return this.throwMtpError();

    try {
      const file = new this.mtpHelper.file_t();
      file.size = size;
      file.name = path.basename(filePath);
      file.type = MTP_FLAGS.FILETYPE_UNKNOWN;
      file.parentId = parentId;
      file.storageId = this.storageId;

      const uploadedFile = this.mtpHelper.Send_File_From_File(
        this.device,
        filePath,
        file,
        (sent, total) => {
          if (typeof callback === 'function') {
            callback({ sent, total, file });
          }
        }
      );

      if (uploadedFile !== 0) {
        return Promise.resolve({
          data: null,
          error: this.ERR.UPLOAD_FILE_FAILED
        });
      }

      return Promise.resolve({
        data: uploadedFile,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> uploadFile`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  async uploadFileTree({ rootNode = false, nodes, parentId, callback }) {
    if (!this.device) return this.throwMtpError();

    try {
      for (let i = 0; i < nodes.length; i += 1) {
        const item = nodes[i];

        if (item.isFolder) {
          const {
            error: createFolderError,
            data: createFolderData
          } = await this.createFolder({
            newFolderName: item.name,
            parentId
          });

          if (createFolderError) {
            return Promise.resolve({
              data: null,
              error: createFolderError
            });
          }

          const {
            error: uploadFileTreeError,
            data: uploadFileTreeData
          } = await this.uploadFileTree({
            nodes: item.children,
            parentId: createFolderData,
            callback
          });

          if (uploadFileTreeError) {
            return Promise.resolve({
              data: null,
              error: uploadFileTreeError
            });
          }

          continue;
        }

        const {
          error: fileExistsError,
          data: fileExistsData
        } = await this.fileExists({
          fileName: item.name,
          parentId
        });

        if (fileExistsError) {
          return Promise.resolve({
            data: null,
            error: fileExistsError
          });
        }

        if (fileExistsData) {
          const {
            error: deleteFileError,
            data: deleteFileData
          } = await this.deleteFile({ fileId: fileExistsData.id });

          if (deleteFileError) {
            return Promise.resolve({
              data: null,
              error: deleteFileError
            });
          }
        }

        const {
          error: uploadFileError,
          data: uploadFileData
        } = await this.uploadFile({
          filePath: item.path,
          parentId,
          size: item.size,
          callback
        });

        if (uploadFileError) {
          return Promise.resolve({
            data: null,
            error: uploadFileError
          });
        }
      }

      return Promise.resolve({
        data: true,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> uploadFileTree`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }
}

module.exports.MTP = MTP;
