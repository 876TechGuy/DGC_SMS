import { useEffect, useRef, useState } from 'react';
import { SampleAssignmentDashboard } from './components/SampleAssignmentDashboard';
import type { Analyst, AssignmentRecord, AuthenticatedUser } from './models/types';

const DEMO_USERS: Record<string, AuthenticatedUser> = {
  supervisor: {
    id: '1',
    displayName: 'S. Grant',
    role: 'supervisor',
    canManageAssignments: true,
    canViewSensitiveData: true,
  },
  analystOne: {
    id: '3',
    displayName: 'A. Reid',
    role: 'analyst',
    canManageAssignments: false,
    canViewSensitiveData: false,
  },
  analystTwo: {
    id: '4',
    displayName: 'B. Campbell',
    role: 'analyst',
    canManageAssignments: false,
    canViewSensitiveData: false,
  },
};

const DEMO_ANALYSTS: Analyst[] = [
  {
    id: '3',
    displayName: 'A. Reid',
    department: 'Food Chemistry',
    activeStatus: 'Active',
    workload: { total: 2, inProgress: 1, overdue: 0, completed: 1 },
  },
  {
    id: '4',
    displayName: 'B. Campbell',
    department: 'Toxicology',
    activeStatus: 'Active',
    workload: { total: 1, inProgress: 1, overdue: 1, completed: 0 },
  },
  {
    id: '5',
    displayName: 'J. Brown',
    department: 'Microbiology',
    activeStatus: 'Inactive',
    workload: { total: 0, inProgress: 0, overdue: 0, completed: 0 },
  },
];

function buildDemoRecords(): AssignmentRecord[] {
  return [
    {
      assignment: {
        id: '12',
        sampleId: '5',
        testId: '12',
        analystId: '3',
        assignedBy: '1',
        assignedByName: 'S. Grant',
        assignedDateTime: '2026-08-20T10:00:00-05:00',
        status: 'In Progress',
        dueDateTime: '2026-08-25',
        priority: 'Routine',
        overdue: false,
        reassignmentReason: null,
      },
      sample: {
        id: '5',
        accessionNumber: 'FOOD-001',
        sampleName: 'Milk Sample',
        sampleType: 'Food (Milk)',
        location: 'Kingston',
        receivedDateTime: '2026-08-18',
        status: 'Registered',
      },
      test: {
        id: '12',
        sampleId: '5',
        testName: 'Fat Content',
        testReference: null,
        dueDateTime: '2026-08-25',
        status: 'In Progress',
        priority: 'Routine',
        assignedAnalystId: '3',
        assignedBy: '1',
        assignedDateTime: '2026-08-20T10:00:00-05:00',
        completedDateTime: null,
        workItemUrl: '/samples/assignment/12',
      },
      analyst: DEMO_ANALYSTS[0],
      history: [
        {
          id: '1',
          action: 'Assigned',
          details: 'Initial assignment created.',
          performedBy: '1',
          performedDateTime: '2026-08-20T10:00:00-05:00',
        },
      ],
    },
    {
      assignment: {
        id: '13',
        sampleId: '6',
        testId: '13',
        analystId: '4',
        assignedBy: '1',
        assignedByName: 'S. Grant',
        assignedDateTime: '2026-08-19T08:15:00-05:00',
        status: 'Report Submitted',
        dueDateTime: '2026-08-21',
        priority: 'STAT',
        overdue: true,
        reassignmentReason: null,
      },
      sample: {
        id: '6',
        accessionNumber: 'TOX-014',
        sampleName: 'Blood Sample',
        sampleType: 'Clinical',
        location: 'Montego Bay',
        receivedDateTime: '2026-08-17',
        status: 'Registered',
      },
      test: {
        id: '13',
        sampleId: '6',
        testName: 'Blood Alcohol',
        testReference: 'FAP-001',
        dueDateTime: '2026-08-21',
        status: 'Report Submitted',
        priority: 'STAT',
        assignedAnalystId: '4',
        assignedBy: '1',
        assignedDateTime: '2026-08-19T08:15:00-05:00',
        completedDateTime: null,
        workItemUrl: '/samples/assignment/13',
      },
      analyst: DEMO_ANALYSTS[1],
      history: [
        {
          id: '2',
          action: 'Report submitted',
          details: 'Submitted for supervisory review.',
          performedBy: '4',
          performedDateTime: '2026-08-20T16:20:00-05:00',
        },
      ],
    },
    {
      assignment: {
        id: '14',
        sampleId: '7',
        testId: '14',
        analystId: null,
        assignedBy: null,
        assignedByName: null,
        assignedDateTime: null,
        status: 'Assigned',
        dueDateTime: '2026-08-28',
        priority: 'Urgent',
        overdue: false,
        reassignmentReason: null,
      },
      sample: {
        id: '7',
        accessionNumber: 'MICRO-009',
        sampleName: 'Water Sample',
        sampleType: 'Environmental',
        location: 'Spanish Town',
        receivedDateTime: '2026-08-20',
        status: 'Registered',
      },
      test: {
        id: '14',
        sampleId: '7',
        testName: 'Microbial Count',
        testReference: null,
        dueDateTime: '2026-08-28',
        status: 'Assigned',
        priority: 'Urgent',
        assignedAnalystId: null,
        assignedBy: null,
        assignedDateTime: null,
        completedDateTime: null,
        workItemUrl: '/samples/assignment/14',
      },
      analyst: null,
      history: [],
    },
  ];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function App() {
  const [userKey, setUserKey] = useState<keyof typeof DEMO_USERS>('supervisor');
  const recordsRef = useRef<AssignmentRecord[]>(buildDemoRecords());

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const method = init?.method ?? 'GET';
      const rawUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const pathname = rawUrl.startsWith('http') ? new URL(rawUrl).pathname : rawUrl;

      if (pathname === '/api/assignments/records' && method === 'GET') {
        return new Response(JSON.stringify({ records: clone(recordsRef.current) }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (pathname === '/api/assignments/analysts' && method === 'GET') {
        return new Response(JSON.stringify({ analysts: clone(DEMO_ANALYSTS) }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const match = pathname.match(/^\/api\/assignments\/([^/]+)\/reassign$/);
      if (match && method === 'POST') {
        const bodyText = typeof init?.body === 'string' ? init.body : '{}';
        const body = JSON.parse(bodyText) as { newAnalystId?: string; reason?: string };
        const analyst = DEMO_ANALYSTS.find((item) => item.id === body.newAnalystId);
        const record = recordsRef.current.find((item) => item.assignment.id === match[1]);

        if (!record) {
          return new Response(JSON.stringify({ error: 'Assignment not found.' }), { status: 404 });
        }
        if (!analyst || analyst.activeStatus !== 'Active') {
          return new Response(JSON.stringify({ error: 'Selected analyst is unavailable.' }), { status: 400 });
        }
        if (record.analyst && !body.reason?.trim()) {
          return new Response(JSON.stringify({ error: 'A reassignment reason is required.' }), { status: 400 });
        }

        const now = new Date().toISOString();
        const updated: AssignmentRecord = {
          ...record,
          analyst,
          assignment: {
            ...record.assignment,
            analystId: analyst.id,
            assignedBy: DEMO_USERS.supervisor.id,
            assignedByName: DEMO_USERS.supervisor.displayName,
            assignedDateTime: now,
            status: 'Assigned',
            reassignmentReason: body.reason?.trim() || null,
          },
          test: {
            ...record.test,
            assignedAnalystId: analyst.id,
            assignedBy: DEMO_USERS.supervisor.id,
            assignedDateTime: now,
            status: 'Assigned',
          },
          history: [
            ...record.history,
            {
              id: `${record.history.length + 1}`,
              action: record.analyst ? 'Reassigned' : 'Assigned',
              details: body.reason?.trim() || 'Demo assignment updated.',
              performedBy: DEMO_USERS.supervisor.id,
              performedDateTime: now,
            },
          ],
        };

        recordsRef.current = recordsRef.current.map((item) =>
          item.assignment.id === updated.assignment.id ? updated : item,
        );

        return new Response(JSON.stringify({ record: clone(updated) }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem' }}>
      <label style={{ display: 'inline-flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <span>Demo user</span>
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
