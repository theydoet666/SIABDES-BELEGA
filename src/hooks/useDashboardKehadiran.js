import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

export function useDashboardKehadiran(rapatId) {
  const [rapat, setRapat] = useState(null);
  const [daftarPeserta, setDaftarPeserta] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [terakhirDiperbarui, setTerakhirDiperbarui] = useState(new Date());

  const saluranRef = useRef(null);

  // Ambil data rapat dan seluruh peserta beserta status kehadiran
  const muatData = useCallback(async () => {
    if (!rapatId) return;
    setGalat(null);

    try {
      // 1. Ambil detail rapat
      const { data: dataRapat, error: errRapat } = await supabase
        .from('rapat')
        .select('*')
        .eq('id', rapatId)
        .single();

      if (errRapat) throw errRapat;
      setRapat(dataRapat);

      // 2. Ambil seluruh undangan beserta kehadiran yang aktif
      const { data: dataUndangan, error: errUndangan } = await supabase
        .from('undangan')
        .select(`
          id,
          rapat_id,
          nama,
          jabatan,
          instansi,
          hp,
          sumber,
          urutan,
          dibuat_pada,
          kehadiran (
            id,
            ttd_path,
            foto_path,
            jalur,
            perangkat_id,
            waktu_perangkat,
            diwakili_oleh,
            dibatalkan,
            alasan_batal,
            dibuat_pada
          )
        `)
        .eq('rapat_id', rapatId)
        .order('urutan', { ascending: true, nullsFirst: false })
        .order('dibuat_pada', { ascending: true });

      if (errUndangan) throw errUndangan;

      // Olah data peserta
      const pesertaTerformat = (dataUndangan || []).map((u, indeks) => {
        // Cari kehadiran aktif yang tidak dibatalkan
        const kehadiranAktif = (u.kehadiran || []).find((k) => !k.dibatalkan) || null;

        return {
          no: indeks + 1,
          undanganId: u.id,
          nama: u.nama,
          jabatan: u.jabatan || '',
          instansi: u.instansi || '',
          hp: u.hp || '',
          sumber: u.sumber,
          urutan: u.urutan,
          sudahHadir: Boolean(kehadiranAktif),
          kehadiran: kehadiranAktif
            ? {
                id: kehadiranAktif.id,
                ttdPath: kehadiranAktif.ttd_path,
                fotoPath: kehadiranAktif.foto_path,
                jalur: kehadiranAktif.jalur,
                waktuCheckin: kehadiranAktif.dibuat_pada,
                diwakiliOleh: kehadiranAktif.diwakili_oleh,
              }
            : null,
        };
      });

      setDaftarPeserta(pesertaTerformat);
      setTerakhirDiperbarui(new Date());
    } catch (err) {
      console.error('Galat memuat data dashboard:', err);
      setGalat('Gagal memuat data kehadiran. Periksa sambungan internet Anda.');
    } finally {
      setMemuat(false);
    }
  }, [rapatId]);

  // Pasang Supabase Realtime Subscription untuk pembaruan instan (PRD 7.9)
  useEffect(() => {
    muatData();

    if (!rapatId) return;

    // Bersihkan langganan lama jika ada
    if (saluranRef.current) {
      supabase.removeChannel(saluranRef.current);
    }

    const saluran = supabase
      .channel(`realtime-kehadiran-${rapatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kehadiran',
          filter: `rapat_id=eq.${rapatId}`,
        },
        () => {
          // Pembaruan data kehadiran langsung dari client/kiosk lain
          muatData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'undangan',
          filter: `rapat_id=eq.${rapatId}`,
        },
        () => {
          // Pembaruan jika ada undangan baru ditambahkan di tempat
          muatData();
        }
      )
      .subscribe();

    saluranRef.current = saluran;

    return () => {
      if (saluranRef.current) {
        supabase.removeChannel(saluranRef.current);
      }
    };
  }, [rapatId, muatData]);

  // Aksi Pembatalan Kehadiran dengan alasan wajib (PRD CI-07 & 7.9)
  const batalkanKehadiran = async (kehadiranId, alasan) => {
    if (!kehadiranId) throw new Error('ID kehadiran tidak valid.');
    if (!alasan || alasan.trim().length < 3) {
      throw new Error('Alasan pembatalan wajib diisi (minimal 3 karakter).');
    }

    const { error } = await supabase
      .from('kehadiran')
      .update({
        dibatalkan: true,
        alasan_batal: alasan.trim(),
      })
      .eq('id', kehadiranId);

    if (error) {
      console.error('Galat saat membatalkan kehadiran:', error);
      throw new Error('Gagal membatalkan kehadiran di server. Coba beberapa saat lagi.');
    }

    // Segarkan data lokal
    await muatData();
  };

  return {
    rapat,
    daftarPeserta,
    memuat,
    galat,
    terakhirDiperbarui,
    muatUlang: muatData,
    batalkanKehadiran,
  };
}
