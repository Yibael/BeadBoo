import type { StoragePort } from './repository';
export const makeDeviceStorage = (namespace: string): StoragePort => ({
  read: slot => localStorage.getItem(`${namespace}-${slot}`),
  write: (slot, value) => localStorage.setItem(`${namespace}-${slot}`, value),
});
export const deviceStorage = makeDeviceStorage('bead-projects');
