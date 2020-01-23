export function releaseDevice(mtpObj) {
  const { error: releaseDeviceError } = mtpObj.releaseDevice();

  if (releaseDeviceError) {
    console.error(releaseDeviceError);
  }
}
