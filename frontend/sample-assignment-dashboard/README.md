# Sample & Test Assignment Dashboard

A compact, embeddable React + TypeScript dashboard widget for laboratory
supervisors and analysts to view and manage sample/test assignments.

This is a standalone widget project (built with [Vite](https://vite.dev)) so
it can be developed, tested and built independently, then embedded into a
host application (for example, mounted inside an existing page or rendered
into a container element from another framework).

## Features

- **Supervisor view** — all analysts' assignments grouped by analyst by
  default, with search, status/priority filters, overdue/blocked
  indicators, assignment history, and an assign/reassign workflow with a
  confirmation step.
- **Analyst view** — automatically scoped to the signed-in analyst's own
  work only (row-level RBAC), with sorting by due date, priority, sample
  age or status, and controls to accept, advance, put on hold, or escalate
  an assignment.
- Loading, empty, error, and no-permission states.
- Responsive layout: a table on desktop, cards on narrow/mobile viewports.
- Accessible markup: semantic tables/labels, `aria-live`/`role="alert"`
  regions, visible focus states, and keyboard-operable controls.
- All demo data uses synthetic identifiers (e.g. `Subject-0001`) — no real
  patient/subject data is included or implied.

## Project layout

```
src/
  models/       Domain types (Sample, Test, Analyst, Assignment, ...)
  data/         Synthetic mock data covering multiple analysts, statuses,
                priorities, overdue/blocked items and a reassignment.
  api/          Mock API/service module (assignmentService.ts) - swap for
                real HTTP calls when integrating with a LIS/backend.
  state/        useAssignmentDashboard hook: fetches data, applies RBAC,
                filtering, sorting, and exposes mutation actions.
  utils/        permissions.ts (RBAC), auditLog.ts, dateUtils.ts,
                filterUtils.ts (search/filter/sort/summary logic).
  components/   Presentational, reusable UI components.
  styles/       dashboard.css
  __tests__/    Unit tests (filtering, RBAC, service, and component tests).
```

## Getting started

```bash
npm install
npm run dev      # local demo harness with a role switcher
npm run build    # type-check + production build
npm run test     # run the unit test suite (Vitest)
npm run lint     # oxlint
```

## Embedding

Import the widget and pass the authenticated user driving RBAC decisions:

```tsx
import { SampleAssignmentDashboard } from 'sample-assignment-dashboard/src';

<SampleAssignmentDashboard
  currentUser={{
    id: 'analyst-1',
    displayName: 'A. Reid',
    role: 'analyst', // or 'supervisor'
    canManageAssignments: false,
    canViewSensitiveData: false,
  }}
/>;
```

## Integration notes

- **Authorization**: `src/utils/permissions.ts` contains the client-side
  RBAC helpers used to decide what a user can see and do. These are
  UI conveniences only — a real deployment **must** re-enforce every
  authorization decision server-side (see the `AUTHZ CHECK` comments in
  `assignmentService.ts` and `permissions.ts`).
- **Audit logging**: `src/utils/auditLog.ts` is an in-memory stand-in for a
  durable audit trail. Replace `recordAuditEntry` with a call to your
  backend's audit/logging service.
- **LIS integration**: `src/api/assignmentService.ts` is a mock service
  layer. Replace its function bodies with real HTTP calls to your
  Laboratory Information System while keeping the same function
  signatures so the rest of the app is unaffected.
- **Sensitive data**: `redactSensitiveFields` masks the
  `patientOrSubjectReference` field for any user without explicit
  `canViewSensitiveData` permission. Demo data already uses synthetic
  identifiers only.
