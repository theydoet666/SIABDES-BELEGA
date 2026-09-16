import { KartuBuktiHadir } from '../../komponen/KartuBuktiHadir.jsx';

export function LayarSelesai({ buktiHadir, onReset }) {
  return (
    <div className="w-full">
      <KartuBuktiHadir buktiHadir={buktiHadir} onSelesai={onReset} durasiOtomatis={5} />
    </div>
  );
}
