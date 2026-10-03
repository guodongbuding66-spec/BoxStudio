let currentProfile = null;

function ascii(bytes, start, len) {
  return String.fromCharCode(...bytes.slice(start, start + len));
}

export function parseIccProfile(buffer, name='profile.icc') {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 128) throw new Error('ICC 文件过小，无法读取标准 128-byte header');
  const declared = ((bytes[0]<<24) | (bytes[1]<<16) | (bytes[2]<<8) | bytes[3]) >>> 0;
  const signature = ascii(bytes, 36, 4);
  if (signature !== 'acsp') throw new Error('不是有效 ICC/ICM profile：header signature 不是 acsp');
  const colorSpace = ascii(bytes, 16, 4);
  const pcs = ascii(bytes, 20, 4);
  const deviceClass = ascii(bytes, 12, 4);
  const versionMajor = bytes[8];
  const versionMinor = bytes[9] >> 4;
  const versionBugfix = bytes[9] & 0x0f;
  if (declared && declared > bytes.length) throw new Error(`ICC header 声明 ${declared} bytes，但文件只有 ${bytes.length} bytes`);
  return {
    name,
    bytes,
    size: bytes.length,
    declaredSize: declared || bytes.length,
    colorSpace: colorSpace.trim(),
    pcs: pcs.trim(),
    deviceClass: deviceClass.trim(),
    version: `${versionMajor}.${versionMinor}.${versionBugfix}`,
    isCmyk: colorSpace === 'CMYK',
  };
}

export function loadOutputIcc(buffer, name='profile.icc') {
  const parsed = parseIccProfile(buffer, name);
  currentProfile = parsed;
  return outputIccInfo();
}

export function clearOutputIcc() { currentProfile = null; }
export function getOutputIcc() { return currentProfile; }
export function outputIccInfo() {
  if (!currentProfile) return null;
  const {name,size,colorSpace,pcs,deviceClass,version,isCmyk} = currentProfile;
  return {name,size,colorSpace,pcs,deviceClass,version,isCmyk};
}
