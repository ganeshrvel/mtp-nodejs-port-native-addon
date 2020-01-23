import mkdirp from 'mkdirp';
import pathParse from 'path-parse';
import { accessSync, R_OK, W_OK } from 'fs';

export const undefinedOrNull = _var => {
  return typeof _var === 'undefined' || _var === null;
};

export const quickHash = str => {
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
};

export const isWritable = folderPath => {
  try {
    accessSync(folderPath, R_OK | W_OK);

    return true;
  } catch (e) {
    return false;
  }
};

export const isArray = n => {
  return Array.isArray(n);
};

export const getExtension = (fileName, isFolder) => {
  if (isFolder) {
    return null;
  }

  const parsedPath = pathInfo(fileName);

  return parsedPath !== null ? parsedPath.ext : null;
};

export const pathInfo = filePath => {
  return pathParse(filePath);
};

export const promisifiedMkdir = ({ newFolderPath }) => {
  try {
    return new Promise(resolve => {
      mkdirp(newFolderPath, error => {
        resolve({ data: null, stderr: error, error });
      });
    });
  } catch (e) {
    console.error(e);
  }
};
