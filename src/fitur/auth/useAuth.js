import { useContext } from 'react';
import { KonteksAuth } from './konteks.js';

export function useAuth() {
  const konteks = useContext(KonteksAuth);
  if (!konteks) {
    throw new Error('useAuth harus digunakan di dalam PenyediaAuth');
  }
  return konteks;
}
