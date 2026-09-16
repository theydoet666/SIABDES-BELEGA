import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { Dialog } from '../../komponen/umum/Dialog.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { formatTanggal } from '../../lib/format.js';

export function ModalPilihUndanganRiwayat({
  buka,
  tutup,
  rapatIdSekarang,
  daftarUndanganSekarang = [],
  onSimpanUndanganTerpilih,
}) {
  const [daftarRapat, setDaftarRapat] = useState([]);
  const [semuaRiwayat, setSemuaRiwayat] = useState([]);
  const [memuat, setMemuat] = useState(false);
  const [rapatDipilih, setRapatDipilih] = useState('semua'); // 'semua' | rapat_id
  const [kataKunci, setKataKunci] = useState('');
  const [terpilih, setTerpilih] = useState(new Set());
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  // Set nama yang sudah terdaftar di rapat saat ini (huruf kecil dinormalisasi)
  const namaEksistingSet = useMemo(() => {
    return new Set(
      daftarUndanganSekarang.map((u) => u.nama.toLowerCase().replace(/\s+/g, ' ').trim())
    );
  }, [daftarUndanganSekarang]);

  // Ambil data riwayat saat modal dibuka
  useEffect(() => {
    if (!buka || !rapatIdSekarang) return;

    let aktif = true;

    async function muatRiwayat() {
      setMemuat(true);
      try {
        // 1. Ambil daftar rapat lampau untuk dropdown filter
        const { data: dataRapat, error: errRapat } = await supabase
          .from('rapat')
          .select('id, judul, tanggal, kode')
          .neq('id', rapatIdSekarang)
          .order('tanggal', { ascending: false });

        if (errRapat) throw errRapat;
        if (aktif) setDaftarRapat(dataRapat || []);

        // 2. Ambil seluruh data undangan dari rapat selain rapat aktif
        const { data: dataUnd, error: errUnd } = await supabase
          .from('undangan')
          .select(`
            id, rapat_id, nama, jabatan, instansi, hp, dibuat_pada,
            rapat:rapat_id (id, judul, tanggal, kode)
          `)
          .neq('rapat_id', rapatIdSekarang)
          .order('dibuat_pada', { ascending: false });

        if (errUnd) throw errUnd;
        if (aktif) setSemuaRiwayat(dataUnd || []);
      } catch (err) {
        console.error('Gagal memuat riwayat undangan:', err);
      } finally {
        if (aktif) setMemuat(false);
      }
    }

    setTerpilih(new Set());
    setKataKunci('');
    setRapatDipilih('semua');
    muatRiwayat();

    return () => {
      aktif = false;
    };
  }, [buka, rapatIdSekarang]);

  // Olah daftar peserta berdasarkan filter rapat & deduplikasi nama jika di tab 'semua'
  const daftarTersaring = useMemo(() => {
    let baris = semuaRiwayat;

    if (rapatDipilih !== 'semua') {
      baris = baris.filter((u) => u.rapat_id === rapatDipilih);
    } else {
      // Deduplikasi nama di mode 'semua' (ambil kemunculan terbaru)
      const petaUnik = new Map();
      for (const item of baris) {
        const norm = item.nama.toLowerCase().replace(/\s+/g, ' ').trim();
        if (!petaUnik.has(norm)) {
          petaUnik.set(norm, item);
        }
      }
      baris = Array.from(petaUnik.values());
    }

    // Filter berdasarkan kata kunci pencarian
    if (kataKunci.trim()) {
      const q = kataKunci.toLowerCase().trim();
      baris = baris.filter(
        (u) =>
          u.nama?.toLowerCase().includes(q) ||
          u.jabatan?.toLowerCase().includes(q) ||
          u.instansi?.toLowerCase().includes(q) ||
          u.hp?.includes(q)
      );
    }

    return baris;
  }, [semuaRiwayat, rapatDipilih, kataKunci]);

  // Daftar peserta yang belum ada di rapat saat ini dan bisa dipilih
  const daftarDapatDipilih = useMemo(() => {
    return daftarTersaring.filter(
      (u) => !namaEksistingSet.has(u.nama.toLowerCase().replace(/\s+/g, ' ').trim())
    );
  }, [daftarTersaring, namaEksistingSet]);

  const togglePilihSatu = (item) => {
    const norm = item.nama.toLowerCase().replace(/\s+/g, ' ').trim();
    if (namaEksistingSet.has(norm)) return;

    setTerpilih((prev) => {
      const salinan = new Set(prev);
      const kunci = `${item.nama}||${item.jabatan || ''}||${item.instansi || ''}||${item.hp || ''}`;
      if (salinan.has(kunci)) {
        salinan.delete(kunci);
      } else {
        salinan.add(kunci);
      }
      return salinan;
    });
  };

  const togglePilihSemua = () => {
    if (terpilih.size === daftarDapatDipilih.length && daftarDapatDipilih.length > 0) {
      setTerpilih(new Set());
    } else {
      const semuaKunci = new Set();
      daftarDapatDipilih.forEach((item) => {
        semuaKunci.add(`${item.nama}||${item.jabatan || ''}||${item.instansi || ''}||${item.hp || ''}`);
      });
      setTerpilih(semuaKunci);
    }
  };

  const tanganiSimpan = async () => {
    if (terpilih.size === 0) return;

    const dataAkanDisimpan = Array.from(terpilih).map((kunci) => {
      const [nama, jabatan, instansi, hp] = kunci.split('||');
      return {
        nama,
        jabatan: jabatan || '',
        instansi: instansi || '',
        hp: hp || '',
        sumber: 'import',
      };
    });

    try {
      setSedangMenyimpan(true);
      await onSimpanUndanganTerpilih(dataAkanDisimpan);
      tutup();
    } catch (err) {
      console.error('Gagal menyimpan undangan terpilih:', err);
    } finally {
      setSedangMenyimpan(false);
    }
  };

  const semuaTerpilih =
    daftarDapatDipilih.length > 0 && terpilih.size === daftarDapatDipilih.length;

  return (
    <Dialog
      buka={buka}
      tutup={() => {
        if (!sedangMenyimpan) tutup();
      }}
      judul="Pilih Undangan dari Riwayat Rapat Sebelumnya"
    >
      <div className="space-y-4 max-h-[75vh] flex flex-col">
        <p className="text-xs text-tinta/70">
          Pilih peserta dari daftar bank data rapat sebelumnya untuk langsung ditambahkan ke daftar
          undangan rapat ini tanpa perlu mengunggah ulang file CSV.
        </p>

        {/* Filter Rapat & Pencarian */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
          {/* Dropdown Sumber Rapat */}
          <div className="sm:col-span-6">
            <label className="block text-[11px] font-bold text-tinta mb-1">
              Sumber Riwayat:
            </label>
            <select
              value={rapatDipilih}
              onChange={(e) => {
                setRapatDipilih(e.target.value);
                setTerpilih(new Set());
              }}
              className="w-full rounded-lg border border-garis bg-white p-2 text-xs font-semibold text-tinta focus:border-daun focus:outline-none focus:ring-2 focus:ring-daun/20"
            >
              <option value="semua">🏛️ Bank Semua Peserta Desa (Nama Unik)</option>
              <optgroup label="Pilih dari Rapat Spesifik:">
                {daftarRapat.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.judul} ({formatTanggal(r.tanggal)})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Input Pencarian */}
          <div className="sm:col-span-6">
            <label className="block text-[11px] font-bold text-tinta mb-1">
              Cari Nama / Instansi:
            </label>
            <input
              type="text"
              placeholder="Ketik nama, jabatan, atau banjar..."
              value={kataKunci}
              onChange={(e) => setKataKunci(e.target.value)}
              className="w-full rounded-lg border border-garis bg-white p-2 text-xs text-tinta focus:border-daun focus:outline-none focus:ring-2 focus:ring-daun/20"
            />
          </div>
        </div>

        {/* Status Ringkas Bar */}
        <div className="flex items-center justify-between rounded-lg bg-kertas p-2.5 text-xs text-tinta/80 border border-garis">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pilih-semua-riwayat"
              checked={semuaTerpilih}
              onChange={togglePilihSemua}
              disabled={daftarDapatDipilih.length === 0}
              className="h-4 w-4 rounded border-garis text-daun focus:ring-daun disabled:opacity-40"
            />
            <label htmlFor="pilih-semua-riwayat" className="font-bold cursor-pointer select-none">
              Pilih Semua yang Belum Terdaftar ({daftarDapatDipilih.length})
            </label>
          </div>

          <div className="text-[11px] font-bold text-daun">
            {terpilih.size} peserta dipilih
          </div>
        </div>

        {/* Tabel / Daftar Peserta dengan Scroll */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[300px] rounded-xl border border-garis divide-y divide-garis bg-white">
          {memuat ? (
            <div className="flex items-center justify-center p-8 text-xs text-tinta/60">
              Memuat data riwayat undangan...
            </div>
          ) : daftarTersaring.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-tinta/60">
              <span className="text-xl mb-1">👥</span>
              {semuaRiwayat.length === 0
                ? 'Belum ada data riwayat undangan dari rapat-rapat sebelumnya.'
                : 'Tidak ada peserta yang cocok dengan pencarian.'}
            </div>
          ) : (
            daftarTersaring.map((peserta) => {
              const norm = peserta.nama.toLowerCase().replace(/\s+/g, ' ').trim();
              const sudahAda = namaEksistingSet.has(norm);
              const kunci = `${peserta.nama}||${peserta.jabatan || ''}||${peserta.instansi || ''}||${peserta.hp || ''}`;
              const dicentang = terpilih.has(kunci);

              return (
                <div
                  key={`${peserta.id}-${kunci}`}
                  onClick={() => !sudahAda && togglePilihSatu(peserta)}
                  className={`flex items-center justify-between p-3 text-xs transition select-none ${
                    sudahAda
                      ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                      : dicentang
                      ? 'bg-daun/10 cursor-pointer'
                      : 'hover:bg-kertas/50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={dicentang || sudahAda}
                      disabled={sudahAda}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-garis text-daun focus:ring-daun disabled:opacity-40"
                    />

                    <div>
                      <div className="font-bold text-tinta flex items-center gap-2">
                        {peserta.nama}
                        {sudahAda && (
                          <span className="rounded bg-gray-200 px-1.5 py-0.2 text-[10px] font-semibold text-gray-700">
                            Sudah Terdaftar
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-tinta/70">
                        {peserta.jabatan || '-'}
                        {peserta.instansi ? ` • ${peserta.instansi}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-tinta/50 hidden sm:block">
                    {peserta.rapat?.judul ? (
                      <span title={peserta.rapat.judul} className="truncate max-w-[150px] inline-block">
                        {peserta.rapat.judul}
                      </span>
                    ) : (
                      'Riwayat Desa'
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tombol Aksi Bawah */}
        <div className="flex items-center justify-between border-t border-garis pt-3">
          <div className="text-xs text-tinta/60">
            {terpilih.size > 0 ? (
              <span className="font-bold text-daun">
                Siap menambahkan {terpilih.size} undangan baru
              </span>
            ) : (
              'Centang nama yang ingin diikutsertakan'
            )}
          </div>

          <div className="flex items-center gap-2">
            <Tombol
              type="button"
              onClick={tutup}
              disabled={sedangMenyimpan}
              className="h-10 rounded-lg border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Batal
            </Tombol>
            <Tombol
              type="button"
              onClick={tanganiSimpan}
              disabled={terpilih.size === 0 || sedangMenyimpan}
              className="h-10 rounded-lg bg-daun px-5 text-xs font-bold text-kertas shadow hover:bg-daun-tua disabled:opacity-40"
            >
              {sedangMenyimpan
                ? 'Menambahkan...'
                : `+ Tambahkan ${terpilih.size > 0 ? `${terpilih.size} Peserta` : 'Peserta'}`}
            </Tombol>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
