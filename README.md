# MTP Port for Node.js - Native addon

- Author: [Ganesh Rathinavel](https://www.linkedin.com/in/ganeshrvel "Ganesh Rathinavel")
- License: [MIT](https://github.com/ganeshrvel/mtp-nodejs-port-native-addon/blob/master/LICENSE "MIT")
- System Requirements: macOS v10.10 or higher, libmtp
- Repo URL: [https://github.com/ganeshrvel/mtp-nodejs-port-native-addon](https://github.com/ganeshrvel/mtp-nodejs-port-native-addon/ "https://github.com/ganeshrvel/mtp-nodejs-port-native-addon")
- Contacts: ganeshrvel@outlook.com


### Introduction

##### MTP Kernel for Node.js - Native addon

Access Android phones and other MTP devices using Node.js. This project uses N-API wrapper around the libmtp library. It uses version 3 of N-API which is only available on Node.js v10 and higher.

### Features
- Upload file to MTP
- Download file from MTP
- Get MTP file tree
- Create MTP folder
- Rename MTP file
- Delete MTP file

## Building from Source

Requirements: [Node.js v10](https://nodejs.org/en/download/ "Install Node.js v10"), [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git "Install Git"), [Yarn package manager](https://yarnpkg.com/lang/en/docs/install/ "Install Yarn package manager"), [libmtp](http://libmtp.sourceforge.net/ "libmtp") and [Homebrew for mac](https://brew.sh/ "Homebrew for mac")

### Install dependencies
```shell
# Ubuntu
sudo apt-get install libmtp-dev
	
# macOS
brew install libmtp
```

### Clone
```shell
$ git clone --depth 1 --single-branch --branch master https://github.com/ganeshrvel/mtp-nodejs-port-native-addon.git

$ cd mtp-nodejs-port-native-addon
```

```shell
$ yarn
```

### Build
```shell
$ yarn run build-node-gyp
```

### Run

Find usage examples in *test.js*

```shell
$ node test.js

// to refresh the MTP
$ node test.js resetmtp

```

### More repos

- [OpenMTP  - Advanced Android File Transfer Application for macOS](https://github.com/ganeshrvel/openmtp "OpenMTP  - Advanced Android File Transfer Application for macOS")
- [npm: electron-root-path](https://github.com/ganeshrvel/npm-electron-root-path "Get the root path of an Electron Application")
- [Electron React Redux Advanced Boilerplate](https://github.com/ganeshrvel/electron-react-redux-advanced-boilerplate "Electron React Redux advanced boilerplate")
- [Tutorial Series by Ganesh Rathinavel](https://github.com/ganeshrvel/tutorial-series-ganesh-rathinavel "Tutorial Series by Ganesh Rathinavel")

### Accolades and Credits

- This is a heavily modified fork of [mceSystems/node-mtp](https://github.com/mceSystems/node-mtp "mceSystems/node-mtp") which has now been discontinued.


### Contribute
- Fork the repo and create your branch from master.
- Ensure that the changes pass linting.
- Update the documentation if needed.
- Make sure your code lints.
- Issue a pull request!

When you submit code changes, your submissions are understood to be under the same [MIT License](https://github.com/ganeshrvel/mtp-nodejs-port-native-addon/blob/master/LICENSE "MIT License") that covers the project. Feel free to contact the maintainers if that's a concern.


### Buy me a coffee
Help me keep the app FREE and open for all.
Paypal me: [paypal.me/ganeshrvel](https://paypal.me/ganeshrvel "paypal.me/ganeshrvel")

### Contacts
Please feel free to contact me at ganeshrvel@outlook.com

### License
MTP Port for node.js - Native addon is released under [MIT License](https://github.com/ganeshrvel/mtp-nodejs-port-native-addon/blob/master/LICENSE "MIT License").

Copyright © 2018-Present Ganesh Rathinavel
