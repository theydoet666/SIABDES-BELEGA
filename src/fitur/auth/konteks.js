import { createContext } from 'react';

export const KonteksAuth = createContext({
  sesi: null,
  pengguna: null,
  profil: null,
  memuat: true,
  galat: null,
  masuk: async () => {},
  keluar: async () => {},
});
