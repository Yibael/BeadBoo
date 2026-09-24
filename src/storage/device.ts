import { File, Paths } from 'expo-file-system';
import type { StoragePort } from './repository';
export const makeDeviceStorage = (namespace: string): StoragePort => ({
  read(slot) {
    const file = new File(Paths.document, `${namespace}-${slot}.json`);
    return file.exists ? file.textSync() : null;
  },
  write(slot, value) {
    const file = new File(Paths.document, `${namespace}-${slot}.json`);
    if (!file.exists) file.create();
    file.write(value);
  },
});
export const deviceStorage = makeDeviceStorage('bead-projects');
