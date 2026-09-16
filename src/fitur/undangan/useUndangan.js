import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

export function useUndangan(rapatId) {
  const [daftarUndangan, setDaftarUndangan] = useState([]);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(null);

  // Ambil seluruh undangan beserta status kehadirannya
  const muatUndangan = useCallback(async () => {
    if (!rapatId) return [];
    setMemuat(true);
    setGalat(null);
    try {
      // Ambil undangan beserta relasi kehadiran
      const { data, error } = await supabase
        .from('undangan')
        .select(`
          id, rapat_id, nama, jabatan, instansi, hp, sumber, urutan, dibuat_pada,
          kehadiran (
            id, ttd_path, foto_path, dibuat_pada, dibatalkan, diwakili_oleh
          )
        `)
        .eq('rapat_id', rapatId)
        .order('urutan', { ascending: true, nullsFirst: false })
        .order('dibuat_pada', { ascending: true });

      if (error) throw error;

      // Transform data dengan status kehadiran aktif
      const hasil = (data || []).map((u) => {
        const kehadiranAktif = u.kehadiran?.find((k) => !k.dibatalkan);
        return {
          ...u,
          sudahHadir: Boolean(kehadiranAktif),
          detailKehadiran: kehadiranAktif || null,
        };
      });

      setDaftarUndangan(hasil);
      return hasil;
    } catch (err) {
      console.error(err);
      setGalat('Gagal memuat daftar undangan.');
      return [];
    } finally {
      setMemuat(false);
    }
  }, [rapatId]);

  // Pasang sinkronisasi Realtime & Event Antrean Lokal
  useEffect(() => {
    muatUndangan();

    if (!rapatId) return;

    const tanganiEventSinkron = () => {
      muatUndangan();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('siabdes_antrean_tersinkron', tanganiEventSinkron);
    }

    const saluran = supabase
      .channel(`realtime-undangan-${rapatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kehadiran',
          filter: `rapat_id=eq.${rapatId}`,
        },
        () => {
          muatUndangan();
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
          muatUndangan();
        }
      )
      .subscribe();

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('siabdes_antrean_tersinkron', tanganiEventSinkron);
      }
      supabase.removeChannel(saluran);
    };
  }, [rapatId, muatUndangan]);

  // Tambah undangan tunggal
  const tambahUndangan = async (dataForm) => {
    setMemuat(true);
    try {
      const payload = {
        rapat_id: rapatId,
        nama: dataForm.nama.trim(),
        jabatan: dataForm.jabatan?.trim() || '',
        instansi: dataForm.instansi?.trim() || '',
        hp: dataForm.hp?.trim() || '',
        sumber: dataForm.sumber || 'import',
      };

      const { data, error } = await supabase.from('undangan').insert([payload]).select().single();
      if (error) {
        if (error.code === '23505') {
          throw new Error('Nama undangan tersebut sudah ada di daftar rapat ini.');
        }
        throw error;
      }

      await muatUndangan();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setMemuat(false);
    }
  };

  // Ubah undangan tunggal
  const ubahUndangan = async (id, dataForm) => {
    setMemuat(true);
    try {
      const { data, error } = await supabase
        .from('undangan')
        .update({
          nama: dataForm.nama.trim(),
          jabatan: dataForm.jabatan?.trim() || '',
          instansi: dataForm.instansi?.trim() || '',
          hp: dataForm.hp?.trim() || '',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await muatUndangan();
      return data;
    } catch (err) {
      console.error(err);
      throw new Error('Gagal memperbarui data undangan.');
    } finally {
      setMemuat(false);
    }
  };

  // Hapus undangan (hanya jika belum check-in)
  const hapusUndangan = async (id, sudahHadir) => {
    if (sudahHadir) {
      throw new Error('Undangan yang sudah melakukan check-in tidak dapat dihapus.');
    }
    setMemuat(true);
    try {
      const { error } = await supabase.from('undangan').delete().eq('id', id);
      if (error) throw error;
      await muatUndangan();
    } catch (err) {
      console.error(err);
      throw new Error('Gagal menghapus undangan.');
    } finally {
      setMemuat(false);
    }
  };

  // Simpan banyak baris hasil impor (UN-07: tidak menghapus/menimpa yang sudah hadir)
  const simpanImporMassal = async (daftarBaru) => {
    setMemuat(true);
    try {
      // Ambil daftar yang sudah ada saat ini
      const { data: eksisting, error: errCari } = await supabase
        .from('undangan')
        .select('id, nama')
        .eq('rapat_id', rapatId);

      if (errCari) throw errCari;

      const namaEksistingSet = new Set(
        (eksisting || []).map((e) => e.nama.toLowerCase().replace(/\s+/g, ' ').trim())
      );

      // Saring hanya nama yang belum ada di database
      const dataAkanDisimpan = daftarBaru
        .filter((item) => {
          const norm = item.nama.toLowerCase().replace(/\s+/g, ' ').trim();
          return !namaEksistingSet.has(norm);
        })
        .map((item, idx) => ({
          rapat_id: rapatId,
          nama: item.nama.trim(),
          jabatan: item.jabatan?.trim() || '',
          instansi: item.instansi?.trim() || '',
          hp: item.hp?.trim() || '',
          sumber: 'import',
          urutan: (eksisting?.length || 0) + idx + 1,
        }));

      if (dataAkanDisimpan.length === 0) {
        return { berhasil: 0, dilewati: daftarBaru.length };
      }

      const { error: insertErr } = await supabase.from('undangan').insert(dataAkanDisimpan);
      if (insertErr) throw insertErr;

      await muatUndangan();
      return {
        berhasil: dataAkanDisimpan.length,
        dilewati: daftarBaru.length - dataAkanDisimpan.length,
      };
    } catch (err) {
      console.error(err);
      throw new Error('Gagal menyimpan hasil impor undangan.');
    } finally {
      setMemuat(false);
    }
  };

  return {
    daftarUndangan,
    memuat,
    galat,
    muatUndangan,
    tambahUndangan,
    ubahUndangan,
    hapusUndangan,
    simpanImporMassal,
  };
}
