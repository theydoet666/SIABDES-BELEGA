import { useContext } from 'react';
import { KonteksPengaturan } from './konteksPengaturan.js';

export function usePengaturan() {
  const context = useContext(KonteksPengaturan);
  if (!context) {
    throw new Error('usePengaturan harus digunakan di dalam PenyediaPengaturan');
  }
  return context;
}
