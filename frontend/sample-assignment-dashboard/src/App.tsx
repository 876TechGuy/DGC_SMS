/** Demo harness for local development - lets you switch between supervisor and analyst views. */
import { useState } from 'react';
import { SampleAssignmentDashboard } from './components/SampleAssignmentDashboard';
import type { AuthenticatedUser } from './models/types';

const DEMO_USERS: Record<string, AuthenticatedUser> = {
  supervisor: {
    id: 'supervisor-1',
    displayName: 'S. Grant (Supervisor)',
    role: 'supervisor',
    canManageAssignments: true,
    canViewSensitiveData: true,
  },
  'analyst-1': {
    id: 'analyst-1',
    displayName: 'A. Reid',
    role: 'analyst',
    canManageAssignments: false,
    canViewSensitiveData: false,
  },
  'analyst-2': {
    id: 'analyst-2',
    displayName: 'B. Campbell',
    role: 'analyst',
    canManageAssignments: false,
    canViewSensitiveData: false,
  },
};

function App() {
  const [userKey, setUserKey] = useState<keyof typeof DEMO_USERS>('supervisor');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
      <label>
        Signed in as:{' '}
        <select
          value={userKey}
          onChange={(e) => setUserKey(e.target.value as keyof typeof DEMO_USERS)}
        >
          {Object.entries(DEMO_USERS).map(([key, user]) => (
            <option key={key} value={key}>
              {user.displayName} ({user.role})
            </option>
          ))}
        </select>
      </label>
      <SampleAssignmentDashboard currentUser={DEMO_USERS[userKey]} />
    </div>
  );
}

export default App;
