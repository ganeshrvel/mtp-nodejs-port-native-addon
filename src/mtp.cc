#include <string>
#include <iostream>
#include <vector>
#include <mutex>
#include <future>
#include <libgen.h>

#ifdef _WIN32
#include <WinSock2.h>
#endif

#include "nbind/nbind.h"
#include "libmtp.h"
#include "./inc/pathutils.h"

#ifndef min
#define min(a, b) (((a) < (b)) ? (a) : (b))
#endif

class databuffer_t {
 public:
  databuffer_t(unsigned char *data, uint32_t size, uint32_t len) : m_data(data), m_size(size), m_length(len) {}

  databuffer_t(const databuffer_t &db) : m_data(db.m_data), m_size(db.m_size), m_length(db.m_length) {}

  uint32_t getLength() { return m_length; }

  uint32_t getSize() { return m_size; }

  void write(nbind::Buffer buf, uint32_t len) {
    memcpy(&(m_data[m_length]), buf.data(), min(m_size - m_length, buf.length()));
    m_length += len;
  }

  void read(nbind::Buffer buf, uint32_t len, uint32_t start) {
    memcpy(buf.data(), &(m_data[start]), min(m_length - start, buf.length()));
  }

 private:
  unsigned char *m_data;
  uint32_t m_length;
  uint32_t m_size;
};

class raw_device_t {
 public:
  raw_device_t(LIBMTP_raw_device_t rawDevice) : m_rawDevice(rawDevice) {}

  raw_device_t(const raw_device_t &rawDevice) : m_rawDevice(rawDevice.m_rawDevice) {}

  uint32_t getBusLocation() { return m_rawDevice.bus_location; }

  void setBusLocation(const uint32_t busLocation) { m_rawDevice.bus_location = busLocation; }

  uint8_t getDevNum() { return m_rawDevice.devnum; }

  void setDevNum(const uint8_t devNum) { m_rawDevice.devnum = devNum; }

  char *getVendor() {
    if (NULL == m_rawDevice.device_entry.vendor) {
      return "";
    }

    return m_rawDevice.device_entry.vendor;
  }

  LIBMTP_raw_device_t *get() { return &m_rawDevice; }

 private:
  LIBMTP_raw_device_t m_rawDevice;
};

class file_t {
 public:
  file_t(LIBMTP_file_t *file = nullptr) : m_name(file ? file->filename : "") {
    if (file) {
      memcpy(&m_file, file, sizeof(m_file));
    } else {
      memset(&m_file, 0, sizeof(m_file));
    }
    m_file.filename = (char *) m_name.c_str();
  }

  file_t(const file_t &file) : m_file(file.m_file), m_name(file.m_name) {
    m_file.filename = (char *) m_name.c_str();
  }

  std::string getName() { return m_name; }

  void setName(const std::string name) { m_name = name; }

  uint32_t getId() { return m_file.item_id; }

  void setId(const uint32_t id) { m_file.item_id = id; }

  uint32_t getType() { return m_file.filetype; }

  void setType(const uint32_t type) { m_file.filetype = (LIBMTP_filetype_t) type; }

  uint64_t getSize() { return m_file.filesize; }

  void setSize(const uint64_t size) { m_file.filesize = size; }

  uint32_t getParentId() { return m_file.parent_id; }

  void setParentId(const uint32_t parentId) { m_file.parent_id = parentId; }

  uint32_t getStorageId() { return m_file.storage_id; }

  void setStorageId(const uint32_t storageId) { m_file.storage_id = storageId; }

  LIBMTP_file_t *get() { return &m_file; }

 private:
  LIBMTP_file_t m_file;
  std::string m_name;
};

class devicestorage_t {
 public:
  devicestorage_t(LIBMTP_devicestorage_t *storage = nullptr) : m_storage(*storage),
                                                               m_description(storage->StorageDescription) {}

  devicestorage_t(const devicestorage_t &storage) : m_storage(storage.m_storage),
                                                    m_description(storage.m_description) {};

  uint32_t getId() { return m_storage.id; }

  void setId(const uint32_t id) { m_storage.id = id; }

  std::string getDescription() { return m_description; }

  void setDescription(const std::string description) { m_description = description; }

 private:
  LIBMTP_devicestorage_t m_storage;
  std::string m_description;
};

class mtpdevice_t {
 public:
  mtpdevice_t(LIBMTP_mtpdevice_t *device = nullptr) : m_device(device) {}

  mtpdevice_t(const mtpdevice_t &device) : m_device(device.m_device) {}

  LIBMTP_mtpdevice_t *m_device;

  std::vector<devicestorage_t> getStorages() {
    std::vector<devicestorage_t> result;
    for (LIBMTP_devicestorage_t *storage = m_device->storage; storage != nullptr; storage = storage->next) {
      result.push_back(devicestorage_t(storage));
    }
    return result;
  }
};

int FileProgressCallback(uint64_t const sent, uint64_t const total, void const *const data) {
  nbind::cbFunction cb = *((nbind::cbFunction *) data);
  cb(sent, total);
  return 0;
}

uint16_t MTPDataPutCallback(void *params, void *priv, uint32_t sendlen, unsigned char *data, uint32_t *putlen) {
  nbind::cbFunction cb = *((nbind::cbFunction *) priv);
  databuffer_t buf(data, sendlen, sendlen);

  if (false == cb.call<bool>(buf)) {
    return LIBMTP_HANDLER_RETURN_ERROR;
  }

  *putlen = sendlen;

  return LIBMTP_HANDLER_RETURN_OK;
}

uint16_t MTPDataGetCallback(void *params, void *priv, uint32_t wantlen, unsigned char *data, uint32_t *gotlen) {
  nbind::cbFunction cb = *((nbind::cbFunction *) priv);
  databuffer_t buf(data, wantlen, 0);

  if (false == cb.call<bool>(buf)) {
    return LIBMTP_HANDLER_RETURN_ERROR;
  }

  *gotlen = buf.getLength();

  return LIBMTP_HANDLER_RETURN_OK;
}

int Get_File_To_File(mtpdevice_t device, uint32_t const id, const std::string path, nbind::cbFunction &cb) {
  return LIBMTP_Get_File_To_File(device.m_device, id, path.c_str(), FileProgressCallback, (const void *) &cb);
}

int Get_File_To_File_Descriptor(mtpdevice_t device, uint32_t const id, int const fd, nbind::cbFunction &cb) {
  return LIBMTP_Get_File_To_File_Descriptor(device.m_device, id, fd, FileProgressCallback, (const void *) &cb);
}

int Get_File_To_Handler(mtpdevice_t device, uint32_t const id, nbind::cbFunction &dataPutCB,
                        nbind::cbFunction &progressCB) {
  return LIBMTP_Get_File_To_Handler(device.m_device, id, MTPDataPutCallback, (void *) &dataPutCB,
                                    FileProgressCallback, (const void *) &progressCB);
}

int Send_File_From_File(mtpdevice_t device, const std::string path, file_t filedata, nbind::cbFunction &cb) {
  return LIBMTP_Send_File_From_File(device.m_device, path.c_str(), filedata.get(), FileProgressCallback,
                                    (const void *) &cb);
}

int Send_File_From_File_Descriptor(mtpdevice_t device, const int fd, file_t filedata, nbind::cbFunction &cb) {
  return LIBMTP_Send_File_From_File_Descriptor(device.m_device, fd, filedata.get(), FileProgressCallback,
                                               (const void *) &cb);
}

int Send_File_From_Handler(mtpdevice_t device, nbind::cbFunction &dataGetCB, file_t filedata,
                           nbind::cbFunction &progressCB) {
  return LIBMTP_Send_File_From_Handler(device.m_device, MTPDataGetCallback, (void *) &dataGetCB, filedata.get(),
                                       FileProgressCallback, (const void *) &progressCB);
}

int Set_File_Name(mtpdevice_t device, file_t file, const std::string path) {
  return LIBMTP_Set_File_Name(device.m_device, file.get(), path.c_str());
}

void Destroy_file(mtpdevice_t device, uint32_t const id) {
  LIBMTP_Delete_Object(device.m_device, id);
}

int Create_Folder(mtpdevice_t device,
                  const std::string fileName,
                  int const parentId,
                  int const storageId) {

  char *cFileName = strdup(fileName.c_str());

  int _return = LIBMTP_Create_Folder(device.m_device, cFileName, parentId, storageId);
  free(cFileName);

  return _return;
}

class SharedBuffer {
 public:
  SharedBuffer() : data(0), size(0), done(false) {}

  std::mutex mx;
  std::condition_variable cv_put;
  std::condition_variable cv_get;
  unsigned char *data;
  uint32_t size;
  bool done;
};

uint16_t MTPDataGet(void *params, void *priv,
                    uint32_t wantlen, unsigned char *data, uint32_t *gotlen) {
  SharedBuffer *shared_buf = (SharedBuffer *) priv;

  uint32_t size = 0;
  *gotlen = 0;

  while (true) {
    std::unique_lock<std::mutex> lk(shared_buf->mx);
    shared_buf->cv_put.wait(lk, [shared_buf] { return shared_buf->done || shared_buf->size; });

    if (shared_buf->size) {
      size = min(wantlen - (*gotlen), shared_buf->size);
      memcpy(data, shared_buf->data, size);
      *gotlen += size;
      data += size;

      shared_buf->size -= size;
      shared_buf->data += size;

      if (0 == shared_buf->size) {
        shared_buf->cv_get.notify_one();
      }

      if (*gotlen == wantlen) {
        break;
      }
    }

    if (shared_buf->done) {
      return LIBMTP_HANDLER_RETURN_CANCEL;
    }
  }

  return LIBMTP_HANDLER_RETURN_OK;
}

uint16_t MTPDataPut(void *params, void *priv,
                    uint32_t sendlen, unsigned char *data, uint32_t *putlen) {
  SharedBuffer *shared_buf = (SharedBuffer *) priv;

  {
    std::lock_guard<std::mutex> lk(shared_buf->mx);
    shared_buf->data = data;
    shared_buf->size = sendlen;
  }

  shared_buf->cv_put.notify_one();

  std::unique_lock<std::mutex> lk(shared_buf->mx);
  shared_buf->cv_get.wait(lk, [shared_buf] { return shared_buf->done || !shared_buf->size; });

  if ((shared_buf->done) && (0 != shared_buf->size)) {
    return LIBMTP_HANDLER_RETURN_CANCEL;
  }

  *putlen = sendlen - shared_buf->size;

  return LIBMTP_HANDLER_RETURN_OK;
}

int Send_File_From_Device(mtpdevice_t device, mtpdevice_t fromDevice, uint32_t const id, file_t filedata,
                          nbind::cbFunction &progressCB) {
  SharedBuffer *shared_buf = new SharedBuffer();

  LIBMTP_mtpdevice_t *dev = fromDevice.m_device;
  std::future<int> resultGet = std::async([dev, shared_buf, id] {
    int result = LIBMTP_Get_File_To_Handler(dev, id, MTPDataPut, shared_buf, nullptr, nullptr);
    {
      std::lock_guard<std::mutex> lk(shared_buf->mx);
      shared_buf->done = true;
    }
    shared_buf->cv_put.notify_all();
    return result;
  });

  int resultSend = LIBMTP_Send_File_From_Handler(device.m_device, MTPDataGet, shared_buf, filedata.get(),
                                                 FileProgressCallback, (const void *) &progressCB);
  {
    std::lock_guard<std::mutex> lk(shared_buf->mx);
    shared_buf->done = true;
  }
  shared_buf->cv_get.notify_all();

  int result = 0;

  if (0 != resultGet.get()) {
    result = 1;
  }

  if (0 != resultSend) {
    result = 1;
  }

  delete shared_buf;

  return result;
}

std::vector<file_t> Get_Files_And_Folders(mtpdevice_t device, uint32_t const storage, uint32_t const parent) {
  std::vector<file_t> result;
  LIBMTP_file_t *next = nullptr;

  for (LIBMTP_file_t *file = LIBMTP_Get_Files_And_Folders(device.m_device, storage, parent);
       nullptr != file; file = next) {
    result.push_back(file);
    next = file->next;
    LIBMTP_destroy_file_t(file);
  }

  return result;
}

file_t Get_Filemetadata(mtpdevice_t device, uint32_t const id) {
  LIBMTP_file_t *file = LIBMTP_Get_Filemetadata(device.m_device, id);

  file_t result(file);

  LIBMTP_destroy_file_t(file);

  return result;
}

int Get_Storage(mtpdevice_t device, const int sortby) {
  return LIBMTP_Get_Storage(device.m_device, sortby);
}

std::string Get_Friendlyname(mtpdevice_t device) {
  char *fn = LIBMTP_Get_Friendlyname(device.m_device);
  std::string result(fn);
  //free(fn)
  return result;
}

std::string Get_Modelname(mtpdevice_t device) {
  char *fn = LIBMTP_Get_Modelname(device.m_device);
  std::string result(fn);
  //free(fn)
  return result;
}

std::string Get_Serialnumber(mtpdevice_t device) {
  char *fn = LIBMTP_Get_Serialnumber(device.m_device);
  std::string result(fn);
  //free(fn)
  return result;
}

std::string Get_Deviceversion(mtpdevice_t device) {
  char *fn = LIBMTP_Get_Deviceversion(device.m_device);
  std::string result(fn);
  //free(fn)
  return result;
}

void Release_Device(mtpdevice_t device) {
  LIBMTP_Release_Device(device.m_device);
}

mtpdevice_t Open_Raw_Device_Uncached(raw_device_t rawDevice) {
  return mtpdevice_t(LIBMTP_Open_Raw_Device_Uncached(rawDevice.get()));
}

mtpdevice_t Open_Raw_Device(raw_device_t rawDevice) {
  return mtpdevice_t(LIBMTP_Open_Raw_Device(rawDevice.get()));
}

void Detect_Raw_Devices(nbind::cbFunction &cb) {
  LIBMTP_raw_device_t *rawdevices = nullptr;
  int numrawdevices = 0;

  LIBMTP_error_number_t err = LIBMTP_Detect_Raw_Devices(&rawdevices, &numrawdevices);
  std::vector<raw_device_t> result;

  if (nullptr != rawdevices) {
    for (int i = 0; i < numrawdevices; i++) {
      result.push_back(rawdevices[i]);
    }
    //free(rawdevices);
  }

  cb((int) err, result);
}

void Init() {
  LIBMTP_Init();
}

NBIND_CLASS(file_t){
    construct<>();
    construct<const file_t&>();
    getset(getName, setName);
    getset(getId, setId);
    getset(getType, setType);
    getset(getSize, setSize);
    getset(getParentId, setParentId);
    getset(getStorageId, setStorageId);
}

NBIND_CLASS(mtpdevice_t){
    construct<>();
    construct<const mtpdevice_t&>();
    method(getStorages);
}

NBIND_CLASS(devicestorage_t){
    construct<>();
    construct<const devicestorage_t&>();
    getset(getId, setId);
    getset(getDescription, setDescription);
}

NBIND_CLASS(raw_device_t){
    construct<LIBMTP_raw_device_t>();
    construct<const raw_device_t&>();
    getset(getBusLocation, setBusLocation);
    getset(getDevNum, setDevNum);
    getter(getVendor);
}

NBIND_CLASS(databuffer_t){
    construct<const databuffer_t &>();
    getter(getLength);
    getter(getSize);
    method(read);
    method(write);
}

NBIND_GLOBAL() {
  function(Init);
  function(Detect_Raw_Devices);
  function(Open_Raw_Device);
  function(Open_Raw_Device_Uncached);
  function(Release_Device);
  function(Get_Friendlyname);
  function(Get_Modelname);
  function(Get_Serialnumber);
  function(Get_Deviceversion);
  function(Get_Storage);
  function(Get_Files_And_Folders);
  function(Get_File_To_File);
  function(Get_File_To_File_Descriptor);
  function(Get_File_To_Handler);
  function(Send_File_From_File);
  function(Send_File_From_File_Descriptor);
  function(Send_File_From_Handler);
  function(Send_File_From_Device);
  function(Get_Filemetadata);
  function(Set_File_Name);
  function(Destroy_file);
  function(Create_Folder);
}
