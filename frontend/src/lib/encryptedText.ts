import { customType } from 'drizzle-orm/sqlite-core';

export type CryptoBox = {
  encrypt(plain: string): Uint8Array;
  decrypt(cipher: Uint8Array): string;
};

export function makeEncryptedText(cryptoBox: CryptoBox) {
  return customType<{ data: string; driverData: Uint8Array }>({
    dataType() {
      return 'blob';
    },
    toDriver(value) {
      return cryptoBox.encrypt(value);
    },
    fromDriver(value) {
      return cryptoBox.decrypt(value);
    },
  });
}
