import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { Dialog } from '../../komponen/umum/Dialog.jsx';
import { prosesDataImpor } from '../../lib/impor.js';

export function ImporCsv({ buka, tutup, onSelesaiImpor, daftarEksisting = [] }) {
  const [file, setFile] = useState(null);
  const [dataPratinjau, setDataPratinjau] = useState([]);
  const [sedangMemproses, setSedangMemproses] = useState(false);
  const [pesanGalat, setPesanGalat] = useState('');

  // Normalisasi baris dari CSV / Excel
  const prosesDataMentah = (rows) => {
    const hasil = prosesDataImpor(rows, daftarEksisting);
    setDataPratinjau(
      hasil.semua.map((item) => ({
        nomorBaris: item.nomor,
        nama: item.nama,
        jabatan: item.jabatan,
        instansi: item.instansi,
        hp: item.hp,
        valid: item.valid,
        alasan: item.alasan,
      }))
    );
  };

  const tanganiPilihBerkas = (e) => {
    const berkas = e.target.files?.[0];
    if (!berkas) return;

    setFile(berkas);
    setPesanGalat('');
    setDataPratinjau([]);

    const namaBerkas = berkas.name.toLowerCase();

    if (namaBerkas.endsWith('.csv') || namaBerkas.endsWith('.txt')) {
      Papa.parse(berkas, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            setPesanGalat('Gagal membaca berkas CSV. Periksa format berkas Anda.');
            return;
          }
          prosesDataMentah(results.data);
        },
        error: (err) => {
          setPesanGalat(`Gagal membaca berkas: ${err.message}`);
        },
      });
    } else if (namaBerkas.endsWith('.xlsx') || namaBerkas.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          prosesDataMentah(data);
        } catch {
          setPesanGalat('Gagal membaca berkas Excel. Pastikan berkas tidak rusak.');
        }
      };
      reader.readAsBinaryString(berkas);
    } else {
      setPesanGalat('Format berkas tidak didukung. Harap unggah berkas .csv atau .xlsx');
    }
  };

  const unduhTemplate = () => {
    const barisCsv = [
      'nama,jabatan,instansi,hp',
      '"I Wayan Sudarsana, S.Sos",Perbekel,Pemerintah Desa Belega,081234567890',
      'Ni Made Sriasih,Sekretaris Desa,Pemerintah Desa Belega,',
      'I Ketut Merta,Kelian Dinas,Banjar Sema,',
    ].join('\n');

    const blob = new Blob([barisCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_undangan_belega.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalSiap = dataPratinjau.filter((d) => d.valid).length;
  const totalDilewati = dataPratinjau.filter((d) => !d.valid).length;

  const tanganiSimpan = async () => {
    const dataValid = dataPratinjau.filter((d) => d.valid);
    if (dataValid.length === 0) {
      setPesanGalat('Tidak ada data valid yang dapat disimpan.');
      return;
    }

    try {
      setSedangMemproses(true);
      await onSelesaiImpor(dataValid);
      tutup();
    } catch (err) {
      setPesanGalat(err.message || 'Gagal menyimpan undangan.');
    } finally {
      setSedangMemproses(false);
    }
  };

  return (
    <Dialog buka={buka} tutup={tutup} judul="Impor Daftar Undangan (CSV / Excel)">
      <div className="space-y-4">
        {/* Panduan & Tombol Unduh Template */}
        <div className="flex flex-col gap-2 rounded-xl bg-kertas p-4 text-xs text-tinta/80 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-tinta">Ketentuan format berkas:</p>
            <p>Kolom wajib: <span className="font-mono font-bold text-daun">nama</span>. Kolom opsional: <span className="font-mono">jabatan, instansi, hp</span>.</p>
          </div>
          <Tombol
            type="button"
            onClick={unduhTemplate}
            className="h-9 whitespace-nowrap rounded-lg border border-garis bg-white px-3 text-xs font-semibold text-daun shadow-sm hover:bg-garis/20"
          >
            📥 Unduh Template CSV
          </Tombol>
        </div>

        {/* Input Pemilihan Berkas */}
        <div>
          <label htmlFor="input-berkas-impor" className="block text-sm font-semibold text-tinta mb-1.5">
            Pilih Berkas CSV atau Excel (.xlsx)
          </label>
          <input
            id="input-berkas-impor"
            type="file"
            accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={tanganiPilihBerkas}
            className="block w-full cursor-pointer rounded-lg border border-garis bg-white p-2 text-sm text-tinta file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-daun file:px-4 file:py-2 file:text-xs file:font-semibold file:text-kertas hover:file:bg-daun-tua focus:outline-none focus:ring-2 focus:ring-daun"
          />
        </div>

        {pesanGalat && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
            {pesanGalat}
          </div>
        )}

        {/* Ringkasan & Pratinjau */}
        {dataPratinjau.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-garis bg-kertas/50 px-4 py-2.5 text-xs font-bold">
              <span className="text-daun">
                ✓ {totalSiap} baris siap diimpor
              </span>
              {totalDilewati > 0 && (
                <span className="text-kuning">
                  ⚠️ {totalDilewati} baris dilewati
                </span>
              )}
            </div>

            {/* Tabel Pratinjau */}
            <div className="max-h-60 overflow-y-auto rounded-lg border border-garis">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-garis bg-kertas text-tinta/70">
                  <tr>
                    <th className="py-2 px-2.5 w-10">No</th>
                    <th className="py-2 px-2.5">Nama</th>
                    <th className="py-2 px-2.5">Jabatan & Instansi</th>
                    <th className="py-2 px-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-garis bg-white">
                  {dataPratinjau.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.valid ? 'hover:bg-kertas/40' : 'bg-amber-50 text-amber-950 font-medium'}
                    >
                      <td className="py-2 px-2.5 font-mono text-[11px] text-tinta/60">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-tinta">
                        {row.nama || <span className="italic text-red-500">(Kosong)</span>}
                      </td>
                      <td className="py-2 px-2.5 text-tinta/80">
                        {row.jabatan} {row.instansi ? `· ${row.instansi}` : ''}
                      </td>
                      <td className="py-2 px-2.5">
                        {row.valid ? (
                          <span className="font-semibold text-daun">Siap</span>
                        ) : (
                          <span className="font-semibold text-amber-800" title={row.alasan}>
                            ⚠️ {row.alasan}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tombol Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-garis pt-4">
          <Tombol
            type="button"
            onClick={tutup}
            className="h-10 rounded-lg border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
          >
            Batal
          </Tombol>
          <Tombol
            type="button"
            onClick={tanganiSimpan}
            disabled={sedangMemproses || totalSiap === 0 || !file}
            className="h-10 rounded-lg bg-daun px-5 text-xs font-bold text-kertas shadow transition hover:bg-daun-tua disabled:opacity-50"
          >
            {sedangMemproses ? 'Menyimpan...' : `Simpan ${totalSiap} Undangan`}
          </Tombol>
        </div>
      </div>
    </Dialog>
  );
}
