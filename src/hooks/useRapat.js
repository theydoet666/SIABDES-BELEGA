import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export function ambilPenandatanganLokal(rapatId) {
  try {
    const raw = localStorage.getItem(`siabdes_ttd_rapat_${rapatId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function simpanPenandatanganLokal(rapatId, data) {
  try {
    if (!rapatId || !data) return;
    localStorage.setItem(`siabdes_ttd_rapat_${rapatId}`, JSON.stringify(data));
  } catch (err) {
    console.warn('Gagal menyimpan cache penandatangan lokal:', err);
  }
}

export function useRapat() {
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(null);

  // Ambil daftar rapat dengan filter tahun, status, atau kata kunci
  const ambilSemuaRapat = useCallback(async ({ tahun, status, kueri } = {}) => {
    setMemuat(true);
    setGalat(null);
    try {
      let query = supabase
        .from('rapat')
        .select(`
          id, kode, judul, tanggal, jam_mulai, jam_selesai, tempat, penyelenggara, status, foto_dihapus_pada, retensi_hari, dibuat_pada,
          undangan(count)
        `)
        .order('tanggal', { ascending: false });

      if (status && status !== 'semua') {
        query = query.eq('status', status);
      }

      if (tahun && tahun !== 'semua') {
        query = query.gte('tanggal', `${tahun}-01-01`).lte('tanggal', `${tahun}-12-31`);
      }

      if (kueri && kueri.trim()) {
        query = query.or(`judul.ilike.%${kueri}%,kode.ilike.%${kueri}%,tempat.ilike.%${kueri}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (err) {
      const pesan = 'Gagal memuat daftar rapat. Periksa sambungan internet Anda.';
      setGalat(pesan);
      console.error(err);
      return [];
    } finally {
      setMemuat(false);
    }
  }, []);

  // Ambil data detail rapat berdasarkan ID
  const ambilDetailRapat = useCallback(async (rapatId) => {
    setMemuat(true);
    setGalat(null);
    try {
      const { data, error } = await supabase
        .from('rapat')
        .select('*')
        .eq('id', rapatId)
        .single();

      if (error) throw error;

      const ttdLokal = ambilPenandatanganLokal(rapatId);
      return {
        ...data,
        ttd_pelaksana_jabatan:
          data.ttd_pelaksana_jabatan || ttdLokal?.ttd_pelaksana_jabatan || 'Kasi Pemerintahan',
        ttd_pelaksana_nama:
          data.ttd_pelaksana_nama || ttdLokal?.ttd_pelaksana_nama || 'Ni Made Arini',
        ttd_sekdes_jabatan:
          data.ttd_sekdes_jabatan || ttdLokal?.ttd_sekdes_jabatan || 'Sekretaris Desa',
        ttd_sekdes_nama:
          data.ttd_sekdes_nama || ttdLokal?.ttd_sekdes_nama || 'Gusti Ketut Amertayasa, S.M',
        ttd_perbekel_jabatan:
          data.ttd_perbekel_jabatan || ttdLokal?.ttd_perbekel_jabatan || data.penandatangan_jabatan || 'Plt. Perbekel Belega',
        ttd_perbekel_nama:
          data.ttd_perbekel_nama || ttdLokal?.ttd_perbekel_nama || data.penandatangan_nama || 'Gusti Ketut Amertayasa, S.M',
        penandatangan_nama:
          data.penandatangan_nama || data.ttd_perbekel_nama || ttdLokal?.penandatangan_nama || 'Gusti Ketut Amertayasa, S.M',
        penandatangan_jabatan:
          data.penandatangan_jabatan || data.ttd_perbekel_jabatan || ttdLokal?.penandatangan_jabatan || 'Plt. Perbekel Belega',
        penandatangan_nip: data.penandatangan_nip || ttdLokal?.penandatangan_nip || '',
        penandatangan_lokasi: data.penandatangan_lokasi || ttdLokal?.penandatangan_lokasi || 'Belega',
      };
    } catch (err) {
      setGalat('Gagal memuat detail rapat.');
      console.error(err);
      return null;
    } finally {
      setMemuat(false);
    }
  }, []);

  // Simpan rapat baru (dengan fallback kompatibilitas skema jika kolom belum dimigrasi di server)
  const buatRapat = async (dataForm, userId) => {
    setMemuat(true);
    setGalat(null);
    try {
      // Buat kode cadangan jika trigger belum terpasang di database
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let kodeAcak = '';
      for (let i = 0; i < 4; i++) {
        kodeAcak += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const payload = {
        ...dataForm,
        kode: dataForm.kode?.trim() ? dataForm.kode.toUpperCase() : kodeAcak,
        dibuat_oleh: userId,
        status: dataForm.status || 'draft',
      };

      let hasil = await supabase.from('rapat').insert([payload]).select().single();

      // Jika kolom penandatangan 3 pihak belum ada di database Supabase (PGRST204)
      if (hasil.error) {
        if (hasil.error.code === 'PGRST204' || hasil.error.message?.includes('schema cache')) {
          console.warn('Kolom penandatangan 3 pihak belum ada di database Supabase, menggunakan fallback kompatibilitas...');
          const {
            ttd_pelaksana_jabatan,
            ttd_pelaksana_nama,
            ttd_sekdes_jabatan,
            ttd_sekdes_nama,
            ttd_perbekel_jabatan,
            ttd_perbekel_nama,
            penandatangan_nama,
            penandatangan_jabatan,
            penandatangan_nip,
            penandatangan_lokasi,
            ...payloadKompatibel
          } = payload;

          hasil = await supabase.from('rapat').insert([payloadKompatibel]).select().single();
          if (hasil.error) throw hasil.error;

          if (hasil.data?.id) {
            simpanPenandatanganLokal(hasil.data.id, {
              ttd_pelaksana_jabatan,
              ttd_pelaksana_nama,
              ttd_sekdes_jabatan,
              ttd_sekdes_nama,
              ttd_perbekel_jabatan,
              ttd_perbekel_nama,
              penandatangan_nama,
              penandatangan_jabatan,
              penandatangan_nip,
              penandatangan_lokasi,
            });
          }

          return {
            ...hasil.data,
            ttd_pelaksana_jabatan,
            ttd_pelaksana_nama,
            ttd_sekdes_jabatan,
            ttd_sekdes_nama,
            ttd_perbekel_jabatan,
            ttd_perbekel_nama,
            penandatangan_nama,
            penandatangan_jabatan,
            penandatangan_nip,
            penandatangan_lokasi,
          };
        } else {
          throw hasil.error;
        }
      }

      if (hasil.data?.id) {
        simpanPenandatanganLokal(hasil.data.id, {
          ttd_pelaksana_jabatan: payload.ttd_pelaksana_jabatan,
          ttd_pelaksana_nama: payload.ttd_pelaksana_nama,
          ttd_sekdes_jabatan: payload.ttd_sekdes_jabatan,
          ttd_sekdes_nama: payload.ttd_sekdes_nama,
          ttd_perbekel_jabatan: payload.ttd_perbekel_jabatan,
          ttd_perbekel_nama: payload.ttd_perbekel_nama,
          penandatangan_nama: payload.penandatangan_nama,
          penandatangan_jabatan: payload.penandatangan_jabatan,
          penandatangan_nip: payload.penandatangan_nip,
          penandatangan_lokasi: payload.penandatangan_lokasi,
        });
      }

      return hasil.data;
    } catch (err) {
      console.error(err);
      throw new Error(err.message || 'Gagal menyimpan rapat baru. Pastikan semua kolom terisi dengan benar.');
    } finally {
      setMemuat(false);
    }
  };

  // Ubah data rapat (dengan fallback kompatibilitas)
  const ubahRapat = async (rapatId, dataForm) => {
    setMemuat(true);
    setGalat(null);
    try {
      simpanPenandatanganLokal(rapatId, {
        ttd_pelaksana_jabatan: dataForm.ttd_pelaksana_jabatan,
        ttd_pelaksana_nama: dataForm.ttd_pelaksana_nama,
        ttd_sekdes_jabatan: dataForm.ttd_sekdes_jabatan,
        ttd_sekdes_nama: dataForm.ttd_sekdes_nama,
        ttd_perbekel_jabatan: dataForm.ttd_perbekel_jabatan,
        ttd_perbekel_nama: dataForm.ttd_perbekel_nama,
        penandatangan_nama: dataForm.penandatangan_nama,
        penandatangan_jabatan: dataForm.penandatangan_jabatan,
        penandatangan_nip: dataForm.penandatangan_nip,
        penandatangan_lokasi: dataForm.penandatangan_lokasi,
      });

      let hasil = await supabase
        .from('rapat')
        .update({
          ...dataForm,
          diperbarui_pada: new Date().toISOString(),
        })
        .eq('id', rapatId)
        .select()
        .single();

      if (hasil.error) {
        if (hasil.error.code === 'PGRST204' || hasil.error.message?.includes('schema cache')) {
          console.warn('Kolom penandatangan 3 pihak belum ada di database Supabase, menggunakan fallback kompatibilitas...');
          const {
            ttd_pelaksana_jabatan,
            ttd_pelaksana_nama,
            ttd_sekdes_jabatan,
            ttd_sekdes_nama,
            ttd_perbekel_jabatan,
            ttd_perbekel_nama,
            penandatangan_nama,
            penandatangan_jabatan,
            penandatangan_nip,
            penandatangan_lokasi,
            ...dataKompatibel
          } = dataForm;

          hasil = await supabase
            .from('rapat')
            .update({
              ...dataKompatibel,
              diperbarui_pada: new Date().toISOString(),
            })
            .eq('id', rapatId)
            .select()
            .single();

          if (hasil.error) throw hasil.error;
        } else {
          throw hasil.error;
        }
      }

      return {
        ...hasil.data,
        ttd_pelaksana_jabatan: dataForm.ttd_pelaksana_jabatan,
        ttd_pelaksana_nama: dataForm.ttd_pelaksana_nama,
        ttd_sekdes_jabatan: dataForm.ttd_sekdes_jabatan,
        ttd_sekdes_nama: dataForm.ttd_sekdes_nama,
        ttd_perbekel_jabatan: dataForm.ttd_perbekel_jabatan,
        ttd_perbekel_nama: dataForm.ttd_perbekel_nama,
        penandatangan_nama: dataForm.penandatangan_nama,
        penandatangan_jabatan: dataForm.penandatangan_jabatan,
        penandatangan_nip: dataForm.penandatangan_nip,
        penandatangan_lokasi: dataForm.penandatangan_lokasi,
      };
    } catch (err) {
      console.error(err);
      throw new Error(err.message || 'Gagal memperbarui data rapat.');
    } finally {
      setMemuat(false);
    }
  };

  // Ubah status rapat (draft -> dibuka -> ditutup)
  const ubahStatusRapat = async (rapatId, statusBaru) => {
    setMemuat(true);
    setGalat(null);
    try {
      const { data, error } = await supabase
        .from('rapat')
        .update({
          status: statusBaru,
          diperbarui_pada: new Date().toISOString(),
        })
        .eq('id', rapatId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error(err);
      throw new Error(`Gagal mengubah status rapat menjadi ${statusBaru}.`);
    } finally {
      setMemuat(false);
    }
  };

  // Duplikasi rapat beserta seluruh undangannya (RP-04)
  const duplikasiRapat = async (rapatId, rapatData, userId) => {
    setMemuat(true);
    setGalat(null);
    try {
      // Coba lewat RPC duplikasi_rapat
      const { data: idBaru, error: rpcErr } = await supabase.rpc('duplikasi_rapat', {
        p_rapat_id: rapatId,
      });

      if (!rpcErr && idBaru) {
        return idBaru;
      }

      // Fallback manual di client jika RPC belum dijalankan di Postgres
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let kodeAcak = '';
      for (let i = 0; i < 4; i++) {
        kodeAcak += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const ttdLokal = ambilPenandatanganLokal(rapatId);

      const { data: rapatBaru, error: buatErr } = await supabase
        .from('rapat')
        .insert([
          {
            judul: `${rapatData.judul} (Salinan)`,
            kode: kodeAcak,
            tanggal: new Date().toISOString().split('T')[0],
            jam_mulai: rapatData.jam_mulai,
            jam_selesai: rapatData.jam_selesai,
            tempat: rapatData.tempat,
            penyelenggara: rapatData.penyelenggara,
            catatan: rapatData.catatan,
            status: 'draft',
            pin_kiosk: String(Math.floor(100000 + Math.random() * 900000)),
            retensi_hari: rapatData.retensi_hari || 90,
            dibuat_oleh: userId,
          },
        ])
        .select()
        .single();

      if (buatErr) throw buatErr;

      if (ttdLokal && rapatBaru?.id) {
        simpanPenandatanganLokal(rapatBaru.id, ttdLokal);
      }

      // Ambil seluruh undangan dari rapat lama
      const { data: undanganLama, error: undErr } = await supabase
        .from('undangan')
        .select('nama, jabatan, instansi, hp, urutan')
        .eq('rapat_id', rapatId);

      if (!undErr && undanganLama?.length > 0) {
        const undanganBaru = undanganLama.map((u) => ({
          ...u,
          rapat_id: rapatBaru.id,
          sumber: 'import',
        }));
        await supabase.from('undangan').insert(undanganBaru);
      }

      return rapatBaru.id;
    } catch (err) {
      console.error(err);
      throw new Error('Gagal menduplikasi rapat.');
    } finally {
      setMemuat(false);
    }
  };

  return {
    memuat,
    galat,
    ambilSemuaRapat,
    ambilDetailRapat,
    buatRapat,
    ubahRapat,
    ubahStatusRapat,
    duplikasiRapat,
  };
}
