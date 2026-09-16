import { useState, useEffect } from 'react';

/**
 * Hook untuk memantau status koneksi jaringan online/offline
 */
export function useJaringan() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const tanganiOnline = () => setOnline(true);
    const tanganiOffline = () => setOnline(false);

    window.addEventListener('online', tanganiOnline);
    window.addEventListener('offline', tanganiOffline);

    return () => {
      window.removeEventListener('online', tanganiOnline);
      window.removeEventListener('offline', tanganiOffline);
    };
  }, []);

  return { online };
}
