export function getStorageContext() {
  return "debug_ygo_player"
}

export function getStorageKey(key: string) {
  if (key.startsWith(getStorageContext())) return key;
  return `${getStorageContext()}_${key}`;
}

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}