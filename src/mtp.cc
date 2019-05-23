#include <string>
#include <iostream>
#include <vector>
#include <mutex>
#include <future>
#include <libgen.h>
#include <stdlib.h>
#include <node.h>
#include <uv.h>

#include "nbind/nbind.h"
#include "libmtp.h"

using v8::Isolate;
using v8::HandleScope;


#ifndef min
#define min(a, b) (((a) < (b)) ? (a) : (b))
#endif

class DataBufferT {
public:
    DataBufferT(unsigned char *data, uint32_t size, uint32_t len) : m_data(data), m_length(len), m_size(size) {}

    DataBufferT(const DataBufferT &db) : m_data(db.m_data), m_length(db.m_length), m_size(db.m_size) {}

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

class RawDeviceT {
public:

    RawDeviceT(LIBMTP_raw_device_t rawDevice) : m_rawDevice(rawDevice) {}

    RawDeviceT(const RawDeviceT &rawDevice) : m_rawDevice(rawDevice.m_rawDevice) {}

    uint32_t getBusLocation() { return m_rawDevice.bus_location; }

    void setBusLocation(const uint32_t busLocation) { m_rawDevice.bus_location = busLocation; }

    uint8_t getDevNum() { return m_rawDevice.devnum; }

    void setDevNum(const uint8_t devNum) { m_rawDevice.devnum = devNum; }

    char *getVendor() {
        if (m_rawDevice.device_entry.vendor == nullptr) {
            return "";
        }

        return m_rawDevice.device_entry.vendor;
    }

    LIBMTP_raw_device_t *get() { return &m_rawDevice; }


private:
    LIBMTP_raw_device_t m_rawDevice;
};


class FileT {
public:
    FileT(LIBMTP_file_t *file = nullptr) : m_name(file ? file->filename : "") {
        if (file) {
            memcpy(&m_file, file, sizeof(m_file));
        } else {
            memset(&m_file, 0, sizeof(m_file));
        }
        m_file.filename = (char *) m_name.c_str();
    }

    FileT(const FileT &file) : m_file(file.m_file), m_name(file.m_name) {
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

    time_t getModificationDate() { return m_file.modificationdate; }

    LIBMTP_file_t *get() { return &m_file; }

private:
    LIBMTP_file_t m_file;
    std::string m_name;
};

class FolderT {
public:
    FolderT(LIBMTP_folder_t *folder = nullptr) : m_name(folder ? folder->name : "") {
        if (folder) {
            memcpy(&m_folder, folder, sizeof(m_folder));
        } else {
            memset(&m_folder, 0, sizeof(m_folder));
        }
        m_folder.name = (char *) m_name.c_str();
    }

    FolderT(const FolderT &folder) : m_folder(folder.m_folder), m_name(folder.m_name) {
        m_folder.name = (char *) m_name.c_str();
    }

    std::string getName() { return m_name; }

    void setName(const std::string name) { m_name = name; }

    uint32_t getId() { return m_folder.folder_id; }

    void setId(const uint32_t id) { m_folder.folder_id = id; }

    uint32_t getParentId() { return m_folder.parent_id; }

    void setParentId(const uint32_t parentId) { m_folder.parent_id = parentId; }

    uint32_t getStorageId() { return m_folder.storage_id; }

    void setStorageId(const uint32_t storageId) { m_folder.storage_id = storageId; }

    LIBMTP_folder_t *getSibling() { return m_folder.sibling; }

    LIBMTP_folder_t *getChild() { return m_folder.child; }

    LIBMTP_folder_t *get() { return &m_folder; }

private:
    LIBMTP_folder_t m_folder;
    std::string m_name;
};

class DeviceStorageT {
public:
    DeviceStorageT(LIBMTP_devicestorage_t *storage = nullptr) : m_storage(*storage),
                                                                m_description(storage->StorageDescription) {}

    DeviceStorageT(const DeviceStorageT &storage) : m_storage(storage.m_storage),
                                                    m_description(storage.m_description) {};

    uint32_t getId() { return m_storage.id; }

    void setId(const uint32_t id) { m_storage.id = id; }

    std::string getDescription() { return m_description; }

    void setDescription(const std::string description) { m_description = description; }

private:
    LIBMTP_devicestorage_t m_storage;
    std::string m_description;
};

class MtpDeviceT {
public:
    MtpDeviceT(LIBMTP_mtpdevice_t *device = nullptr) : m_device(device) {}

    MtpDeviceT(const MtpDeviceT &device) : m_device(device.m_device) {}

    LIBMTP_mtpdevice_t *m_device;

    std::vector<DeviceStorageT> getStorages() {
        std::vector<DeviceStorageT> result;
        for (LIBMTP_devicestorage_t *storage = m_device->storage; storage != nullptr; storage = storage->next) {
            result.push_back(DeviceStorageT(storage));
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
    DataBufferT buf(data, sendlen, sendlen);

    if (false == cb.call<bool>(buf)) {
        return LIBMTP_HANDLER_RETURN_ERROR;
    }

    *putlen = sendlen;

    return LIBMTP_HANDLER_RETURN_OK;
}

uint16_t MTPDataGetCallback(void *params, void *priv, uint32_t wantlen, unsigned char *data, uint32_t *gotlen) {
    nbind::cbFunction cb = *((nbind::cbFunction *) priv);
    DataBufferT buf(data, wantlen, 0);

    if (false == cb.call<bool>(buf)) {
        return LIBMTP_HANDLER_RETURN_ERROR;
    }

    *gotlen = buf.getLength();

    return LIBMTP_HANDLER_RETURN_OK;
}

int Get_File_To_File(MtpDeviceT device, uint32_t const id, const std::string path, nbind::cbFunction &cb) {
    return LIBMTP_Get_File_To_File(device.m_device, id, path.c_str(), FileProgressCallback, (const void *) &cb);
}

int Get_File_To_File_Descriptor(MtpDeviceT device, uint32_t const id, int const fd, nbind::cbFunction &cb) {
    return LIBMTP_Get_File_To_File_Descriptor(device.m_device, id, fd, FileProgressCallback, (const void *) &cb);
}

int Get_File_To_Handler(MtpDeviceT device, uint32_t const id, nbind::cbFunction &dataPutCB,
                        nbind::cbFunction &progressCB) {
    return LIBMTP_Get_File_To_Handler(device.m_device, id, MTPDataPutCallback, (void *) &dataPutCB,
                                      FileProgressCallback, (const void *) &progressCB);
}

int Send_File_From_File(MtpDeviceT device, const std::string path, FileT filedata, nbind::cbFunction &cb) {
    return LIBMTP_Send_File_From_File(device.m_device, path.c_str(), filedata.get(), FileProgressCallback,
                                      (const void *) &cb);
}

int Send_File_From_File_Descriptor(MtpDeviceT device, const int fd, FileT filedata, nbind::cbFunction &cb) {
    return LIBMTP_Send_File_From_File_Descriptor(device.m_device, fd, filedata.get(), FileProgressCallback,
                                                 (const void *) &cb);
}

int Send_File_From_Handler(MtpDeviceT device, nbind::cbFunction &dataGetCB, FileT filedata,
                           nbind::cbFunction &progressCB) {
    return LIBMTP_Send_File_From_Handler(device.m_device, MTPDataGetCallback, (void *) &dataGetCB, filedata.get(),
                                         FileProgressCallback, (const void *) &progressCB);
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

int Send_File_From_Device(MtpDeviceT device, MtpDeviceT fromDevice, uint32_t const id, FileT filedata,
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

std::string Get_Friendlyname(MtpDeviceT device) {
    char *fn = LIBMTP_Get_Friendlyname(device.m_device);
    std::string result(fn);
    free(fn);
    return result;
}

MtpDeviceT Open_Raw_Device(RawDeviceT rawDevice) {
    return MtpDeviceT(LIBMTP_Open_Raw_Device(rawDevice.get()));
}

uint32_t lookup_folder_id(LIBMTP_folder_t *folder, char *path, char *parent) {
    char *current;
    uint32_t ret = (uint32_t) -1;

    if (strcmp(path, "/") == 0) {
        return 0;
    }

    if (folder == NULL) {
        return ret;
    }

    current = static_cast<char *>(malloc(strlen(parent) + strlen(folder->name) + 2));
    sprintf(current, "%s/%s", parent, folder->name);

    if (strcasecmp(path, current) == 0) {
        free(current);
        return folder->folder_id;
    }
    if (strncasecmp(path, current, strlen(current)) == 0) {
        ret = lookup_folder_id(folder->child, path, current);
    }
    free(current);
    if (ret != (uint32_t) (-1)) {
        return ret;
    }

    ret = lookup_folder_id(folder->sibling, path, parent);
    return ret;
}

int parse_path(char *path, LIBMTP_file_t *files, LIBMTP_folder_t *folders) {
    char *rest;
    uint32_t item_id;

    // Check if path is an item_id
    if (*path != '/') {
        item_id = strtoul(path, &rest, 0);
        // really should check contents of "rest" here...
        /* if not number, assume a file name */
        if (item_id == 0) {
            LIBMTP_file_t *file = files;

            /* search for matching name */
            while (file != NULL) {
                if (strcasecmp(file->filename, path) == 0) {
                    return file->item_id;
                }
                file = file->next;
            }
        }
        return item_id;
    }

    // Check if path is a folder
    item_id = lookup_folder_id(folders, path, const_cast<char *>(""));

    if (item_id == (uint32_t) -1) {
        char *dirc = strdup(path);
        char *basec = strdup(path);
        char *parent = dirname(dirc);
        char *filename = basename(basec);

        uint32_t parent_id = lookup_folder_id(folders, parent, const_cast<char *>(""));
        LIBMTP_file_t *file;

        file = files;
        while (file != NULL) {
            if (file->parent_id == parent_id) {
                if (strcasecmp(file->filename, filename) == 0) {
                    free(dirc);
                    free(basec);
                    return file->item_id;
                }
            }
            file = file->next;
        }
        free(dirc);
        free(basec);
    } else {
        return item_id;
    }

    return -1;
}


int pathToId(const std::string path, FileT fileData, FolderT folderData) {
    char *cPath = strdup(path.c_str());
    int _return = parse_path(cPath, fileData.get(), folderData.get());

    free(cPath);

    return _return;
}

std::string Get_Modelname(MtpDeviceT device) {
    char *fn = LIBMTP_Get_Modelname(device.m_device);
    std::string result(fn);
    free(fn);
    return result;
}

std::string Get_Serialnumber(MtpDeviceT device) {
    char *fn = LIBMTP_Get_Serialnumber(device.m_device);
    std::string result(fn);
    free(fn);
    return result;
}

std::string Get_Deviceversion(MtpDeviceT device) {
    char *fn = LIBMTP_Get_Deviceversion(device.m_device);
    std::string result(fn);
    free(fn);
    return result;
}


/*
 * WorkerDetectRawDevices
 */

class WorkerDetectRawDevices {
public:
    WorkerDetectRawDevices(nbind::cbFunction cb) : callback(cb) {}

    uv_work_t worker;
    nbind::cbFunction callback;

    bool error;
    std::string errorMsg;

    std::vector<RawDeviceT> result;
    int numrawdevices = 0;
    LIBMTP_error_number_t err;

};

void DetectRawDevicesDone(uv_work_t *order, int status) {
    Isolate *isolate = Isolate::GetCurrent();
    HandleScope handleScope(isolate);

    WorkerDetectRawDevices *work = static_cast< WorkerDetectRawDevices * >( order->data );

    if (work->error) {
        work->callback.call<void>(work->errorMsg.c_str(), (int) work->err, work->result);
    } else {
        work->callback.call<void>(NULL, (int) work->err, work->result);
    }

    // Memory cleanup
    work->callback.reset();
    delete work;
}

void DetectRawDevicesRunner(uv_work_t *order) {
    WorkerDetectRawDevices *work = static_cast< WorkerDetectRawDevices * >( order->data );
    LIBMTP_raw_device_t *rawdevices = nullptr;

    try {
        work->err = LIBMTP_Detect_Raw_Devices(&rawdevices, &work->numrawdevices);


        if (nullptr != rawdevices) {
            for (int i = 0; i < work->numrawdevices; i++) {
                work->result.push_back(rawdevices[i]);
            }
            free(rawdevices);
        }
    }
    catch (...) {
        work->error = true;
        work->errorMsg = "Error occured while detecting raw devices";
    }
}

void DetectRawDevices(nbind::cbFunction &callback) {
    WorkerDetectRawDevices *work = new WorkerDetectRawDevices(callback);

    work->worker.data = work;
    work->error = false;

    uv_queue_work(uv_default_loop(), &work->worker, DetectRawDevicesRunner, DetectRawDevicesDone);
}

/*
 * WorkerOpenRawDeviceUncached
 */

class WorkerOpenRawDeviceUncached {
public:
    WorkerOpenRawDeviceUncached(RawDeviceT rawDevice, nbind::cbFunction cb) : callback(cb), rawDevice(rawDevice) {}

    uv_work_t worker;
    nbind::cbFunction callback;

    bool error;
    std::string errorMsg;

    RawDeviceT rawDevice;
    MtpDeviceT mtpDevice;
};

void OpenRawDeviceUncachedDone(uv_work_t *order, int status) {
    Isolate *isolate = Isolate::GetCurrent();
    HandleScope handleScope(isolate);

    WorkerOpenRawDeviceUncached *work = static_cast< WorkerOpenRawDeviceUncached * >( order->data );

    if (work->error) {
        work->callback.call<void>(work->errorMsg.c_str(), work->mtpDevice);
    } else {
        work->callback.call<void>(NULL, work->mtpDevice);
    }

    // Memory cleanup
    work->callback.reset();
    delete work;
}

void OpenRawDeviceUncachedRunner(uv_work_t *order) {
    WorkerOpenRawDeviceUncached *work = static_cast< WorkerOpenRawDeviceUncached * >( order->data );

    try {
        work->mtpDevice = MtpDeviceT(LIBMTP_Open_Raw_Device_Uncached(work->rawDevice.get()));
    }
    catch (...) {
        work->error = true;
        work->errorMsg = "Error occured while opening raw devices";
    }
}

void OpenRawDeviceUncached(RawDeviceT rawDevice, nbind::cbFunction &callback) {
    WorkerOpenRawDeviceUncached *work = new WorkerOpenRawDeviceUncached(rawDevice, callback);

    work->worker.data = work;
    work->rawDevice = rawDevice;
    work->error = false;

    uv_queue_work(uv_default_loop(), &work->worker, OpenRawDeviceUncachedRunner, OpenRawDeviceUncachedDone);
}

/*
 * WorkerGetStorage
 */

class WorkerGetStorage {
public:
    WorkerGetStorage(MtpDeviceT device, int sortby, nbind::cbFunction cb) :
            callback(cb), device(device), sortby(sortby) {}

    uv_work_t worker;
    nbind::cbFunction callback;

    bool error;
    std::string errorMsg;

    MtpDeviceT device;
    int sortby;
    int output;
};

void GetStorageDone(uv_work_t *order, int status) {
    Isolate *isolate = Isolate::GetCurrent();
    HandleScope handleScope(isolate);

    WorkerGetStorage *work = static_cast< WorkerGetStorage * >( order->data );

    if (work->error) {
        work->callback.call<void>(work->errorMsg.c_str(), work->output);
    } else {
        work->callback.call<void>(NULL, work->output);
    }

    // Memory cleanup
    work->callback.reset();
    delete work;
}

void GetStorageRunner(uv_work_t *order) {
    WorkerGetStorage *work = static_cast< WorkerGetStorage * >( order->data );

    try {
        work->output = LIBMTP_Get_Storage(work->device.m_device, work->sortby);
    }
    catch (...) {
        work->error = true;
        work->errorMsg = "Error occured while accessing the MTP storage";
    }
}

void GetStorage(MtpDeviceT device, const int sortby, nbind::cbFunction &callback) {
    WorkerGetStorage *work = new WorkerGetStorage(device, sortby, callback);

    work->worker.data = work;
    work->device = device;
    work->sortby = sortby;
    work->error = false;

    uv_queue_work(uv_default_loop(), &work->worker, GetStorageRunner, GetStorageDone);
}


/*
 * WorkerReleaseDevice
 */

class WorkerReleaseDevice {
public:
    WorkerReleaseDevice(MtpDeviceT device, nbind::cbFunction cb) :
            callback(cb), device(device) {}

    uv_work_t worker;
    nbind::cbFunction callback;

    bool error;
    std::string errorMsg;

    MtpDeviceT device;
};

void ReleaseDeviceDone(uv_work_t *order, int status) {
    Isolate *isolate = Isolate::GetCurrent();
    HandleScope handleScope(isolate);

    WorkerReleaseDevice *work = static_cast< WorkerReleaseDevice * >( order->data );

    if (work->error) {
        work->callback.call<void>(work->errorMsg.c_str());
    } else {
        work->callback.call<void>(NULL);
    }

    // Memory cleanup
    work->callback.reset();
    delete work;
}

void ReleaseDeviceRunner(uv_work_t *order) {
    WorkerReleaseDevice *work = static_cast< WorkerReleaseDevice * >( order->data );

    try {
        LIBMTP_Release_Device(work->device.m_device);
    }
    catch (...) {
        work->error = true;
        work->errorMsg = "Error occured while releasing the MTP device";
    }
}

void ReleaseDevice(MtpDeviceT device, nbind::cbFunction &callback) {
    WorkerReleaseDevice *work = new WorkerReleaseDevice(device, callback);

    work->worker.data = work;
    work->device = device;
    work->error = false;

    uv_queue_work(uv_default_loop(), &work->worker, ReleaseDeviceRunner, ReleaseDeviceDone);
}


/*
 * WorkerGetFilesAndFolders
 */

class WorkerGetFilesAndFolders {
public:
    WorkerGetFilesAndFolders(MtpDeviceT device, uint32_t storage, uint32_t parent, nbind::cbFunction cb) :
            callback(cb), device(device), storage(storage), parent(parent) {};

    uv_work_t worker;
    nbind::cbFunction callback;

    bool error;
    std::string errorMsg;

    MtpDeviceT device;
    uint32_t storage;
    uint32_t parent;
    std::vector<FileT> output;
};

void GetFilesAndFoldersDone(uv_work_t *order, int status) {
    Isolate *isolate = Isolate::GetCurrent();
    HandleScope handleScope(isolate);

    WorkerGetFilesAndFolders *work = static_cast< WorkerGetFilesAndFolders * >( order->data );

    if (work->error) {
        work->callback.call<void>(work->errorMsg.c_str(), work->output);
    } else {
        work->callback.call<void>(NULL, work->output);
    }

    // Memory cleanup
    work->callback.reset();
    delete work;
}

void GetFilesAndFoldersRunner(uv_work_t *order) {
    WorkerGetFilesAndFolders *work = static_cast< WorkerGetFilesAndFolders * >( order->data );

    LIBMTP_file_t *next = nullptr;

    try {
        for (LIBMTP_file_t *file = LIBMTP_Get_Files_And_Folders(work->device.m_device, work->storage, work->parent);
             nullptr != file; file = next) {
            work->output.push_back(file);
            next = file->next;
            LIBMTP_destroy_file_t(file);
        }
    }
    catch (...) {
        work->error = true;
        work->errorMsg = "Error occured while listing the directory";
    }
}

void GetFilesAndFolders(MtpDeviceT device, uint32_t const storage, uint32_t const parent, nbind::cbFunction &callback) {
    WorkerGetFilesAndFolders *work = new WorkerGetFilesAndFolders(device, storage, parent, callback);

    work->worker.data = work;
    work->device = device;
    work->storage = storage;
    work->parent = parent;
    work->error = false;

    uv_queue_work(uv_default_loop(), &work->worker, GetFilesAndFoldersRunner, GetFilesAndFoldersDone);
}


/*
 * WorkerGetFilesAndFolders
 */

class WorkerGetFileMetaData {
public:
    WorkerGetFileMetaData(MtpDeviceT device, uint32_t fileId, nbind::cbFunction cb) :
            callback(cb), device(device), fileId(fileId) {};

    uv_work_t worker;
    nbind::cbFunction callback;

    bool error;
    std::string errorMsg;

    MtpDeviceT device;
    uint32_t fileId;
    FileT output;
};

void GetFileMetaDataDone(uv_work_t *order, int status) {
    Isolate *isolate = Isolate::GetCurrent();
    HandleScope handleScope(isolate);

    WorkerGetFileMetaData *work = static_cast< WorkerGetFileMetaData * >( order->data );

    if (work->error) {
        work->callback.call<void>(work->errorMsg.c_str(), work->output);
    } else {
        work->callback.call<void>(NULL, work->output);
    }

    // Memory cleanup
    work->callback.reset();
    delete work;
}

void GetFileMetaDataRunner(uv_work_t *order) {
    WorkerGetFileMetaData *work = static_cast< WorkerGetFileMetaData * >( order->data );

    try {
        LIBMTP_file_t *file = LIBMTP_Get_Filemetadata(work->device.m_device, work->fileId);
        FileT result(file);

        LIBMTP_destroy_file_t(file);

        work->output = result;
    }
    catch (...) {
        work->error = true;
        work->errorMsg = "Error occured while fetching the meta data";
    }
}

void GetFileMetaData(MtpDeviceT device, uint32_t const fileId, nbind::cbFunction &callback) {
    WorkerGetFileMetaData *work = new WorkerGetFileMetaData(device, fileId, callback);

    work->worker.data = work;
    work->device = device;
    work->fileId = fileId;
    work->error = false;

    uv_queue_work(uv_default_loop(), &work->worker, GetFileMetaDataRunner, GetFileMetaDataDone);
}

/*
 * WorkerSetFileName
 */

class WorkerSetFileName {
public:
    WorkerSetFileName(MtpDeviceT device, FileT file, std::string path, nbind::cbFunction cb) :
            callback(cb), device(device), file(file), path(path) {};

    uv_work_t worker;
    nbind::cbFunction callback;

    bool error;
    std::string errorMsg;

    MtpDeviceT device;
    FileT file;
    std::string path;
    int output;
};

void SetFileNameDone(uv_work_t *order, int status) {
    Isolate *isolate = Isolate::GetCurrent();
    HandleScope handleScope(isolate);

    WorkerSetFileName *work = static_cast< WorkerSetFileName * >( order->data );

    if (work->error) {
        work->callback.call<void>(work->errorMsg.c_str(), work->output);
    } else {
        work->callback.call<void>(NULL, work->output);
    }

    // Memory cleanup
    work->callback.reset();
    delete work;
}

void SetFileNameRunner(uv_work_t *order) {
    WorkerSetFileName *work = static_cast< WorkerSetFileName * >( order->data );

    try {
        work->output = LIBMTP_Set_File_Name(work->device.m_device, work->file.get(), work->path.c_str());
    }
    catch (...) {
        work->error = true;
        work->errorMsg = "Error occured while renaming the file";
    }
}

void SetFileName(MtpDeviceT device, FileT file, const std::string path, nbind::cbFunction &callback) {
    WorkerSetFileName *work = new WorkerSetFileName(device, file, path, callback);

    work->worker.data = work;
    work->device = device;
    work->file = file;
    work->path = path;
    work->error = false;

    uv_queue_work(uv_default_loop(), &work->worker, SetFileNameRunner, SetFileNameDone);
}


/*
 * WorkerSetFileName
 */
class WorkerCreateFolder {
public:
    WorkerCreateFolder(MtpDeviceT device, std::string fileName, int parentId, int storageId, nbind::cbFunction cb) :
            callback(cb), device(device), fileName(fileName), parentId(parentId), storageId(storageId) {};

    uv_work_t worker;
    nbind::cbFunction callback;

    bool error;
    std::string errorMsg;

    MtpDeviceT device;
    std::string fileName;
    int parentId;
    int storageId;
    int output;
};

void CreateFolderDone(uv_work_t *order, int status) {
    Isolate *isolate = Isolate::GetCurrent();
    HandleScope handleScope(isolate);

    WorkerCreateFolder *work = static_cast< WorkerCreateFolder * >( order->data );

    if (work->error) {
        work->callback.call<void>(work->errorMsg.c_str(), work->output);
    } else {
        work->callback.call<void>(NULL, work->output);
    }

    // Memory cleanup
    work->callback.reset();
    delete work;
}

void CreateFolderRunner(uv_work_t *order) {
    WorkerCreateFolder *work = static_cast< WorkerCreateFolder * >( order->data );

    try {
        char *cFileName = strdup(work->fileName.c_str());

        int result = LIBMTP_Create_Folder(work->device.m_device, cFileName, work->parentId, work->storageId);
        free(cFileName);

        work->output = result;
    }
    catch (...) {
        work->error = true;
        work->errorMsg = "Error occured while creating a new directory";
    }
}

void CreateFolder(MtpDeviceT device,
                  const std::string fileName,
                  int const parentId,
                  int const storageId, nbind::cbFunction &callback) {
    WorkerCreateFolder *work = new WorkerCreateFolder(device, fileName, parentId, storageId, callback);

    work->worker.data = work;
    work->device = device;
    work->fileName = fileName;
    work->parentId = parentId;
    work->storageId = storageId;
    work->error = false;

    uv_queue_work(uv_default_loop(), &work->worker, CreateFolderRunner, CreateFolderDone);
}

/*
 * WorkerSetFileName
 */

class WorkerDestroyFile {
public:
    WorkerDestroyFile(MtpDeviceT device, int fileId, nbind::cbFunction cb) :
            callback(cb), device(device), fileId(fileId) {};

    uv_work_t worker;
    nbind::cbFunction callback;

    bool error;
    std::string errorMsg;

    MtpDeviceT device;
    int fileId;
    int output;
};

void DestroyFileDone(uv_work_t *order, int status) {
    Isolate *isolate = Isolate::GetCurrent();
    HandleScope handleScope(isolate);

    WorkerDestroyFile *work = static_cast< WorkerDestroyFile * >( order->data );

    if (work->error) {
        work->callback.call<void>(work->errorMsg.c_str(), work->output);
    } else {
        work->callback.call<void>(NULL, work->output);
    }

    // Memory cleanup
    work->callback.reset();
    delete work;
}

void DestroyFileRunner(uv_work_t *order) {
    WorkerDestroyFile *work = static_cast< WorkerDestroyFile * >( order->data );

    try {
        LIBMTP_Delete_Object(work->device.m_device, work->fileId);

        work->output = true;
    }
    catch (...) {
        work->error = true;
        work->errorMsg = "Error occured while deleting the file";
    }
}

void DestroyFile(MtpDeviceT device,
                 uint32_t const fileId, nbind::cbFunction &callback) {
    WorkerDestroyFile *work = new WorkerDestroyFile(device, fileId, callback);

    work->worker.data = work;
    work->device = device;
    work->fileId = fileId;
    work->error = false;

    uv_queue_work(uv_default_loop(), &work->worker, DestroyFileRunner, DestroyFileDone);
}

void Init() {
    LIBMTP_Init();
}

NBIND_CLASS(FileT){
        construct<>();
        construct<const FileT&>();
        getset(getName, setName);
        getset(getId, setId);
        getset(getType, setType);
        getset(getSize, setSize);
        getset(getParentId, setParentId);
        getset(getStorageId, setStorageId);
        getter(getModificationDate);
};

NBIND_CLASS(FolderT){
        construct<>();
        construct<const FolderT&>();
        getset(getName, setName);
        getset(getId, setId);
        getset(getParentId, setParentId);
        getset(getStorageId, setStorageId);
        getter(getChild);
        getter(getSibling);
};

NBIND_CLASS(MtpDeviceT){
        construct<>();
        construct<const MtpDeviceT&>();
        method(getStorages);
};

NBIND_CLASS(DeviceStorageT){
        construct<>();
        construct<const DeviceStorageT&>();
        getset(getId, setId);
        getset(getDescription, setDescription);
};

NBIND_CLASS(RawDeviceT){
        construct<LIBMTP_raw_device_t>();
        construct<const RawDeviceT&>();
        getset(getBusLocation, setBusLocation);
        getset(getDevNum, setDevNum);
        getter(getVendor);
};

NBIND_CLASS(DataBufferT){
        construct<const DataBufferT &>();
        getter(getLength);
        getter(getSize);
        method(read);
        method(write);
};

NBIND_GLOBAL() {
    function(Init);
    function(DetectRawDevices); // async
    function(OpenRawDeviceUncached); // async
    function(Open_Raw_Device);
    function(ReleaseDevice);// async
    function(Get_Friendlyname);
    function(Get_Modelname);
    function(Get_Serialnumber);
    function(Get_Deviceversion);
    function(GetStorage);// async
    function(GetFilesAndFolders);// async
    function(Get_File_To_File);
    function(Get_File_To_File_Descriptor);
    function(Get_File_To_Handler);
    function(Send_File_From_File);
    function(Send_File_From_File_Descriptor);
    function(Send_File_From_Handler);
    function(Send_File_From_Device);
    function(GetFileMetaData); //async
    function(SetFileName); //async
    function(DestroyFile); //async
    function(CreateFolder); //async
    function(pathToId);
};
