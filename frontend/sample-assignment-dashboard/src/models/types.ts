/** Roles recognised by the widget for role-based access control (RBAC). */
export type UserRole = 'supervisor' | 'analyst';

/** The currently authenticated user driving the dashboard's RBAC decisions. */
export interface AuthenticatedUser {
  id: string;
  displayName: string;
  role: UserRole;
  canManageAssignments: boolean;
  canViewSensitiveData: boolean;
}

export type SamplePriority = 'Routine' | 'Urgent' | 'STAT';

export type AssignmentStatus =
  | 'Assigned'
  | 'In Progress'
  | 'Report Submitted'
  | 'Preliminary Review'
  | 'Senior Chemist Review'
  | 'Returned for Correction'
  | 'Accepted'
  | 'Rejected'
  | 'Completed';

export interface Sample {
  id: string;
  accessionNumber: string;
  sampleName: string;
  sampleType: string;
  location: string | null;
  receivedDateTime: string | null;
  status: string | null;
}

export type TestPriority = 'Routine' | 'Urgent' | 'STAT';

export interface Test {
  id: string;
  sampleId: string;
  testName: string;
  testReference: string | null;
  dueDateTime: string | null;
  status: AssignmentStatus;
  priority: TestPriority;
  assignedAnalystId: string | null;
  assignedBy: string | null;
  assignedDateTime: string | null;
  completedDateTime: string | null;
  workItemUrl: string;
}

export interface Analyst {
  id: string;
  displayName: string;
  department: string;
  activeStatus: 'Active' | 'Inactive';
  workload?: {
    total: number;
    inProgress: number;
    overdue: number;
    completed: number;
  };
}

export interface Assignment {
  id: string;
  sampleId: string;
  testId: string;
  analystId: string | null;
  assignedBy: string | null;
  assignedByName: string | null;
  assignedDateTime: string | null;
  status: AssignmentStatus;
  dueDateTime: string | null;
  priority: TestPriority;
  overdue: boolean;
  reassignmentReason: string | null;
}

export interface AssignmentHistoryEntry {
  id: string;
  action: string;
  details: string | null;
  performedBy: string | null;
  performedDateTime: string | null;
}

export interface AssignmentRecord {
  assignment: Assignment;
  sample: Sample;
  test: Test;
  analyst: Analyst | null;
  history: AssignmentHistoryEntry[];
}

export const ALL_STATUSES: AssignmentStatus[] = [
  'Assigned',
  'In Progress',
  'Report Submitted',
  'Preliminary Review',
  'Senior Chemist Review',
  'Returned for Correction',
  'Accepted',
  'Rejected',
  'Completed',
];

export const ALL_PRIORITIES: TestPriority[] = ['Routine', 'Urgent', 'STAT'];
