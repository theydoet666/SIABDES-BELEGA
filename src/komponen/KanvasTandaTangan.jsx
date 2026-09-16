import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { pangkasKanvasTtd } from '../lib/gambar.js';
import { Tombol } from './umum/Tombol.jsx';

export const KanvasTandaTangan = forwardRef(function KanvasTandaTangan(
  { onStatusCoretan, tinggi = 220 },
  ref
) {
  const kanvasRef = useRef(null);
  const titikTerakhirRef = useRef(null);
  const sedangMenggambarRef = useRef(false);
  const [adaCoretan, setAdaCoretan] = useState(false);
  const [pesanGalat, setPesanGalat] = useState('');

  // Atur gaya konteks kanvas (garis tebal 3px, ujung bundar, garis menyambung solid)
  const terapkanGayaKonteks = useCallback((ctx) => {
    if (!ctx) return;
    ctx.strokeStyle = '#1c3a7a'; // Token pena (PRD 13.1)
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]); // Garis solid tanpa putus-putus
  }, []);

  // Atur resolusi kanvas dengan devicePixelRatio (TT-02)
  const inisialisasiKanvas = useCallback(() => {
    const kanvas = kanvasRef.current;
    if (!kanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = kanvas.getBoundingClientRect();

    kanvas.width = rect.width * dpr;
    kanvas.height = tinggi * dpr;

    const ctx = kanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    terapkanGayaKonteks(ctx);
  }, [tinggi, terapkanGayaKonteks]);

  useEffect(() => {
    inisialisasiKanvas();
    window.addEventListener('resize', inisialisasiKanvas);
    return () => window.removeEventListener('resize', inisialisasiKanvas);
  }, [inisialisasiKanvas]);

  // Dapatkan koordinat lokal pointer terhadap elemen kanvas
  const dapatkanPosisi = (e) => {
    const rect = kanvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Pointer Down (TT-01)
  const mulaiGambar = (e) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    sedangMenggambarRef.current = true;
    setPesanGalat('');

    const pos = dapatkanPosisi(e);
    titikTerakhirRef.current = pos;

    const ctx = kanvasRef.current.getContext('2d');
    terapkanGayaKonteks(ctx);

    // Gambar titik awal bundar
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1c3a7a';
    ctx.fill();

    setAdaCoretan(true);
    if (onStatusCoretan) onStatusCoretan(true);
  };

  // Pointer Move dengan sambungan garis kontinu menyambung sempurna (TT-03)
  const lanjutkanGambar = (e) => {
    if (!sedangMenggambarRef.current) return;
    e.preventDefault();

    const kanvas = kanvasRef.current;
    if (!kanvas) return;

    const rect = kanvas.getBoundingClientRect();
    const ctx = kanvas.getContext('2d');
    terapkanGayaKonteks(ctx);

    const events = typeof e.getCoalescedEvents === 'function' && e.getCoalescedEvents().length > 0
      ? e.getCoalescedEvents()
      : [e];

    let prev = titikTerakhirRef.current;

    ctx.beginPath();
    if (prev) {
      ctx.moveTo(prev.x, prev.y);
    }

    for (const ev of events) {
      const pos = {
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
      };

      if (!prev) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
      prev = pos;
    }

    ctx.stroke();
    titikTerakhirRef.current = prev;
  };

  // Pointer Up / Cancel
  const selesaiGambar = (e) => {
    if (!sedangMenggambarRef.current) return;
    sedangMenggambarRef.current = false;
    titikTerakhirRef.current = null;
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch {
      // Abaikan jika pointer capture sudah dilepas
    }
  };

  // Kosongkan kanvas (TT-06)
  const bersihkan = useCallback(() => {
    const kanvas = kanvasRef.current;
    if (!kanvas) return;
    const ctx = kanvas.getContext('2d');
    ctx.clearRect(0, 0, kanvas.width, kanvas.height);
    terapkanGayaKonteks(ctx);
    titikTerakhirRef.current = null;
    setAdaCoretan(false);
    setPesanGalat('');
    if (onStatusCoretan) onStatusCoretan(false);
  }, [onStatusCoretan, terapkanGayaKonteks]);

  // Ekspor hasil tanda tangan pangkas transparan (TT-04, TT-05, TT-08)
  const dapatkanHasil = useCallback(() => {
    const kanvas = kanvasRef.current;
    const hasil = pangkasKanvasTtd(kanvas, 8, 360);

    if (!hasil || !hasil.valid) {
      const pesan = hasil?.alasan || 'Tanda tangan belum diisi.';
      setPesanGalat(pesan);
      return null;
    }

    return hasil.dataUrl;
  }, []);

  useImperativeHandle(ref, () => ({
    bersihkan,
    dapatkanHasil,
    adaCoretan,
  }));

  return (
    <div className="w-full space-y-3">
      <div className="relative rounded-2xl border-2 border-garis bg-white p-2 shadow-xs transition focus-within:border-daun">
        {/* Kanvas interaktif dengan Pointer Events */}
        <canvas
          ref={kanvasRef}
          style={{ height: `${tinggi}px`, touchAction: 'none' }}
          className="w-full cursor-crosshair rounded-xl bg-kertas/30"
          onPointerDown={mulaiGambar}
          onPointerMove={lanjutkanGambar}
          onPointerUp={selesaiGambar}
          onPointerCancel={selesaiGambar}
        />

        {/* Petunjuk saat kanvas masih kosong */}
        {!adaCoretan && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium text-tinta/40">
              Tanda tangani di area ini dengan jari atau stylus
            </span>
          </div>
        )}

        {/* Tombol Ulangi di pojok kanan bawah kanvas */}
        {adaCoretan && (
          <div className="absolute right-3 bottom-3">
            <Tombol
              type="button"
              onClick={bersihkan}
              className="h-9 rounded-lg border border-garis bg-white/90 px-3 text-xs font-semibold text-tinta shadow-sm backdrop-blur hover:bg-white"
            >
              🔄 Ulangi
            </Tombol>
          </div>
        )}
      </div>

      {pesanGalat && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-center text-xs font-semibold text-red-800">
          {pesanGalat}
        </div>
      )}
    </div>
  );
});

