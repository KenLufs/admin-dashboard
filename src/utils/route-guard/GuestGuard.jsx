'use client';
import PropTypes from 'prop-types';

import { useEffect } from 'react';

// next
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// project-imports
import Loader from 'components/Loader';

// ==============================|| GUEST GUARD ||============================== //

export default function GuestGuard({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/api/auth/protected');
      const json = await res?.json();
      if (json?.protected) {
        router.push(ispValueAvailable ? '/dashboard/default?isp=1' : '/dashboard/default');
      }
    };
    fetchData();

    // eslint-disable-next-line
  }, [session]);

  if (status === 'loading' || session?.user) return <Loader />;

  return <>{children}</>;
}

GuestGuard.propTypes = { children: PropTypes.any };
