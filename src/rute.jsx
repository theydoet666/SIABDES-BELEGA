import { createBrowserRouter, Navigate } from 'react-router-dom';
import HalamanLogin from './fitur/auth/HalamanLogin.jsx';
import { PenjagaRute } from './fitur/auth/PenjagaRute.jsx';
import DaftarRapat from './fitur/rapat/DaftarRapat.jsx';
import FormRapat from './fitur/rapat/FormRapat.jsx';
import DetailRapat from './fitur/rapat/DetailRapat.jsx';
import DashboardRapat from './fitur/dashboard/DashboardRapat.jsx';
import LembarCetak from './fitur/keluaran/LembarCetak.jsx';
import AlurCheckin from './fitur/registrasi/AlurCheckin.jsx';
import HalamanPengaturan from './fitur/pengaturan/HalamanPengaturan.jsx';
import HalamanPrivasi from './fitur/privasi/HalamanPrivasi.jsx';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Navigate to="/rapat" replace />,
    },
    {
      path: '/masuk',
      element: <HalamanLogin />,
    },
    {
      path: '/privasi',
      element: <HalamanPrivasi />,
    },
    {
      path: '/rapat',
      element: (
        <PenjagaRute>
          <DaftarRapat />
        </PenjagaRute>
      ),
    },
    {
      path: '/rapat/baru',
      element: (
        <PenjagaRute>
          <FormRapat />
        </PenjagaRute>
      ),
    },
    {
      path: '/rapat/:id',
      element: (
        <PenjagaRute>
          <DetailRapat />
        </PenjagaRute>
      ),
    },
    {
      path: '/rapat/:id/dashboard',
      element: (
        <PenjagaRute>
          <DashboardRapat />
        </PenjagaRute>
      ),
    },
    {
      path: '/rapat/:id/cetak',
      element: (
        <PenjagaRute>
          <LembarCetak />
        </PenjagaRute>
      ),
    },
    {
      path: '/kiosk/:kode',
      element: <AlurCheckin jalur="kiosk" />,
    },
    {
      path: '/r/:kode',
      element: <AlurCheckin jalur="mandiri" />,
    },
    {
      path: '/pengaturan',
      element: (
        <PenjagaRute peranDiperlukan="admin">
          <HalamanPengaturan />
        </PenjagaRute>
      ),
    },
    {
      path: '*',
      element: <div className="p-8 text-center">Halaman tidak ditemukan</div>,
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);
