import { RouterProvider } from 'react-router-dom';
import { PenyediaAuth } from './fitur/auth/KonteksAuth.jsx';
import { PenyediaPengaturan } from './fitur/pengaturan/KonteksPengaturan.jsx';
import { router } from './rute.jsx';

export default function App() {
  return (
    <PenyediaAuth>
      <PenyediaPengaturan>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </PenyediaPengaturan>
    </PenyediaAuth>
  );
}

