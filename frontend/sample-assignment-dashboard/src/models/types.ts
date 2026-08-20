/**
 * Core domain model for the Sample & Test Assignment Dashboard widget.
 *
 * NOTE: These types intentionally mirror the data model suggested by the
 * laboratory workflow requirements. They are transport/UI models only -
 * integration with a real Laboratory Information System (LIS) would map
 * these onto whatever schema that system exposes.
 */

/** Roles recognised by the widget for role-based access control (RBAC). */
export type UserRole = 'supervisor' | 'analyst';

/** The currently authenticated user driving the dashboard's RBAC decisions. */
export interface AuthenticatedUser {
  id: string;
  displayName: string;
  role: UserRole;
  /** Whether this user is allowed to assign/reassign work to analysts. */
  canManageAssignments: boolean;
  /** Whether this user is allowed to view identifying patient/subject data. */
  canViewSensitiveData: boolean;
}

export type SamplePriority = 'Routine' | 'Urgent' | 'STAT';

export type SampleStatus =
  | 'Received'
  | 'In Progress'
  | 'On Hold'
  | 'Completed';

export interface Sample {
  id: string;
  accessionNumber: string;
  /**
   * Reference to the patient/subject the sample belongs to.
   * In demo data this is always a synthetic identifier
   * (e.g. "Subject-0007") - never a real name or record number.
   */
  patientOrSubjectReference: string;
  collectionDateTime: string;
  receivedDateTime: string;
  specimenType: string;
  priority: SamplePriority;
  location: string;
  status: SampleStatus;
}

export type TestStatus =
  | 'Unassigned'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'On Hold'
  | 'Escalated';

export type TestPriority = 'Routine' | 'Urgent' | 'STAT';

export interface Test {
  id: string;
  sampleId: string;
  testName: string;
  methodology: string;
  dueDateTime: string;
  status: TestStatus;
  priority: TestPriority;
  requiredSkills: string[];
  instructions: string;
  assignedAnalystId: string | null;
  assignedBy: string | null;
  assignedDateTime: string | null;
  completedDateTime: string | null;
  blockedReason: string | null;
  notes: string | null;
}

export interface Analyst {
  id: string;
  displayName: string;
  department: string;
  activeStatus: 'Active' | 'Inactive';
  permittedTestTypes: string[];
}

export type AssignmentStatus =
  | 'Unassigned'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'On Hold'
  | 'Escalated';

export interface Assignment {
  id: string;
  sampleId: string;
  testId: string;
  analystId: string | null;
  assignedBy: string | null;
  assignedDateTime: string | null;
  status: AssignmentStatus;
  dueDateTime: string;
  reassignmentReason: string | null;
}

/** A single audit trail entry recording a change to an assignment. */
export interface AssignmentHistoryEntry {
  id: string;
  assignmentId: string;
  action:
    | 'Assigned'
    | 'Reassigned'
    | 'Accepted'
    | 'StatusChanged'
    | 'Escalated';
  performedBy: string;
  performedDateTime: string;
  fromAnalystId: string | null;
  toAnalystId: string | null;
  fromStatus: AssignmentStatus | null;
  toStatus: AssignmentStatus | null;
  reason: string | null;
}

/** Denormalised row combining sample + test + assignment + analyst for display. */
export interface AssignmentRecord {
  assignment: Assignment;
  sample: Sample;
  test: Test;
  analyst: Analyst | null;
  history: AssignmentHistoryEntry[];
}

export const ALL_STATUSES: AssignmentStatus[] = [
  'Unassigned',
  'Assigned',
  'In Progress',
  'Completed',
  'On Hold',
  'Escalated',
];

export const ALL_PRIORITIES: TestPriority[] = ['Routine', 'Urgent', 'STAT'];
