/**
 * Synthetic demo data for the Sample & Test Assignment Dashboard.
 *
 * IMPORTANT: All patient/subject references, names and identifiers below are
 * fictitious placeholders (e.g. "Subject-0001"). No real laboratory,
 * patient, or personnel data is used anywhere in this module.
 */
import type {
  Analyst,
  Assignment,
  AssignmentHistoryEntry,
  AssignmentRecord,
  Sample,
  Test,
} from '../models/types';

export const mockAnalysts: Analyst[] = [
  {
    id: 'analyst-1',
    displayName: 'A. Reid',
    department: 'Toxicology',
    activeStatus: 'Active',
    permittedTestTypes: ['GC-MS Screen', 'Blood Alcohol'],
  },
  {
    id: 'analyst-2',
    displayName: 'B. Campbell',
    department: 'Pharmaceutical',
    activeStatus: 'Active',
    permittedTestTypes: ['Dissolution', 'Assay (HPLC)'],
  },
  {
    id: 'analyst-3',
    displayName: 'C. Brown',
    department: 'Food (Milk)',
    activeStatus: 'Active',
    permittedTestTypes: ['Fat Content', 'Microbial Count'],
  },
  {
    id: 'analyst-4',
    displayName: 'D. Salmon',
    department: 'Toxicology',
    activeStatus: 'Inactive',
    permittedTestTypes: ['GC-MS Screen'],
  },
];

const iso = (offsetHours: number): string => {
  const base = new Date('2026-08-20T12:00:00Z');
  base.setHours(base.getHours() + offsetHours);
  return base.toISOString();
};

export const mockSamples: Sample[] = [
  {
    id: 'sample-1',
    accessionNumber: 'ACC-100001',
    patientOrSubjectReference: 'Subject-0001',
    collectionDateTime: iso(-72),
    receivedDateTime: iso(-70),
    specimenType: 'Blood',
    priority: 'Urgent',
    location: 'Toxicology Bench 1',
    status: 'In Progress',
  },
  {
    id: 'sample-2',
    accessionNumber: 'ACC-100002',
    patientOrSubjectReference: 'Subject-0002',
    collectionDateTime: iso(-48),
    receivedDateTime: iso(-47),
    specimenType: 'Tablet',
    priority: 'Routine',
    location: 'Pharma Bench 2',
    status: 'Received',
  },
  {
    id: 'sample-3',
    accessionNumber: 'ACC-100003',
    patientOrSubjectReference: 'Subject-0003',
    collectionDateTime: iso(-96),
    receivedDateTime: iso(-95),
    specimenType: 'Milk',
    priority: 'STAT',
    location: 'Food Lab Bench 1',
    status: 'On Hold',
  },
  {
    id: 'sample-4',
    accessionNumber: 'ACC-100004',
    patientOrSubjectReference: 'Subject-0004',
    collectionDateTime: iso(-24),
    receivedDateTime: iso(-23),
    specimenType: 'Blood',
    priority: 'Routine',
    location: 'Toxicology Bench 2',
    status: 'Completed',
  },
  {
    id: 'sample-5',
    accessionNumber: 'ACC-100005',
    patientOrSubjectReference: 'Subject-0005',
    collectionDateTime: iso(-120),
    receivedDateTime: iso(-118),
    specimenType: 'Capsule',
    priority: 'Urgent',
    location: 'Pharma Bench 1',
    status: 'In Progress',
  },
  {
    id: 'sample-6',
    accessionNumber: 'ACC-100006',
    patientOrSubjectReference: 'Subject-0006',
    collectionDateTime: iso(-10),
    receivedDateTime: iso(-9),
    specimenType: 'Milk',
    priority: 'Routine',
    location: 'Food Lab Bench 2',
    status: 'Received',
  },
];

export const mockTests: Test[] = [
  {
    id: 'test-1',
    sampleId: 'sample-1',
    testName: 'GC-MS Screen',
    methodology: 'Gas Chromatography-Mass Spectrometry',
    dueDateTime: iso(-2), // overdue
    status: 'In Progress',
    priority: 'Urgent',
    requiredSkills: ['GC-MS Screen'],
    instructions: 'Screen for common drug classes per SOP TOX-013.',
    assignedAnalystId: 'analyst-1',
    assignedBy: 'supervisor-1',
    assignedDateTime: iso(-60),
    completedDateTime: null,
    blockedReason: null,
    notes: null,
  },
  {
    id: 'test-2',
    sampleId: 'sample-2',
    testName: 'Assay (HPLC)',
    methodology: 'High Performance Liquid Chromatography',
    dueDateTime: iso(30),
    status: 'Unassigned',
    priority: 'Routine',
    requiredSkills: ['Assay (HPLC)'],
    instructions: 'Determine active ingredient concentration per LAB-023.',
    assignedAnalystId: null,
    assignedBy: null,
    assignedDateTime: null,
    completedDateTime: null,
    blockedReason: null,
    notes: null,
  },
  {
    id: 'test-3',
    sampleId: 'sample-3',
    testName: 'Microbial Count',
    methodology: 'Standard Plate Count',
    dueDateTime: iso(-5), // overdue and blocked
    status: 'On Hold',
    priority: 'STAT',
    requiredSkills: ['Microbial Count'],
    instructions: 'Incubate per FAP-002 and record colony counts.',
    assignedAnalystId: 'analyst-3',
    assignedBy: 'supervisor-1',
    assignedDateTime: iso(-90),
    completedDateTime: null,
    blockedReason: 'Awaiting incubator availability',
    notes: 'Escalated to lab manager for equipment scheduling.',
  },
  {
    id: 'test-4',
    sampleId: 'sample-4',
    testName: 'Blood Alcohol',
    methodology: 'Headspace GC',
    dueDateTime: iso(-30),
    status: 'Completed',
    priority: 'Routine',
    requiredSkills: ['Blood Alcohol'],
    instructions: 'Quantify blood alcohol content per FAP-001.',
    assignedAnalystId: 'analyst-1',
    assignedBy: 'supervisor-1',
    assignedDateTime: iso(-80),
    completedDateTime: iso(-28),
    blockedReason: null,
    notes: null,
  },
  {
    id: 'test-5',
    sampleId: 'sample-5',
    testName: 'Dissolution',
    methodology: 'USP Apparatus II',
    dueDateTime: iso(6),
    status: 'Escalated',
    priority: 'STAT',
    requiredSkills: ['Dissolution'],
    instructions: 'Run dissolution profile per LAB-023, flag any failures.',
    assignedAnalystId: 'analyst-2',
    assignedBy: 'supervisor-1',
    assignedDateTime: iso(-12),
    completedDateTime: null,
    blockedReason: null,
    notes: 'Escalated due to prior out-of-spec result on related batch.',
  },
  {
    id: 'test-6',
    sampleId: 'sample-6',
    testName: 'Fat Content',
    methodology: 'Gerber Method',
    dueDateTime: iso(48),
    status: 'Assigned',
    priority: 'Routine',
    requiredSkills: ['Fat Content'],
    instructions: 'Determine fat content per FAP-002.',
    assignedAnalystId: 'analyst-3',
    assignedBy: 'supervisor-1',
    assignedDateTime: iso(-1),
    completedDateTime: null,
    blockedReason: null,
    notes: null,
  },
];

export const mockAssignments: Assignment[] = mockTests.map((test) => ({
  id: `assignment-${test.id}`,
  sampleId: test.sampleId,
  testId: test.id,
  analystId: test.assignedAnalystId,
  assignedBy: test.assignedBy,
  assignedDateTime: test.assignedDateTime,
  status: test.status,
  dueDateTime: test.dueDateTime,
  reassignmentReason: test.id === 'test-5' ? 'Original analyst on leave' : null,
}));

export const mockHistory: AssignmentHistoryEntry[] = [
  {
    id: 'history-1',
    assignmentId: 'assignment-test-1',
    action: 'Assigned',
    performedBy: 'supervisor-1',
    performedDateTime: iso(-60),
    fromAnalystId: null,
    toAnalystId: 'analyst-1',
    fromStatus: 'Unassigned',
    toStatus: 'Assigned',
    reason: null,
  },
  {
    id: 'history-2',
    assignmentId: 'assignment-test-1',
    action: 'StatusChanged',
    performedBy: 'analyst-1',
    performedDateTime: iso(-58),
    fromAnalystId: 'analyst-1',
    toAnalystId: 'analyst-1',
    fromStatus: 'Assigned',
    toStatus: 'In Progress',
    reason: null,
  },
  {
    id: 'history-3',
    assignmentId: 'assignment-test-5',
    action: 'Reassigned',
    performedBy: 'supervisor-1',
    performedDateTime: iso(-12),
    fromAnalystId: 'analyst-4',
    toAnalystId: 'analyst-2',
    fromStatus: 'Assigned',
    toStatus: 'Assigned',
    reason: 'Original analyst on leave',
  },
  {
    id: 'history-4',
    assignmentId: 'assignment-test-5',
    action: 'Escalated',
    performedBy: 'analyst-2',
    performedDateTime: iso(-3),
    fromAnalystId: 'analyst-2',
    toAnalystId: 'analyst-2',
    fromStatus: 'Assigned',
    toStatus: 'Escalated',
    reason: 'Out-of-spec result observed on related batch',
  },
  {
    id: 'history-5',
    assignmentId: 'assignment-test-3',
    action: 'StatusChanged',
    performedBy: 'analyst-3',
    performedDateTime: iso(-40),
    fromAnalystId: 'analyst-3',
    toAnalystId: 'analyst-3',
    fromStatus: 'Assigned',
    toStatus: 'On Hold',
    reason: 'Awaiting incubator availability',
  },
];

/** Builds fully denormalised assignment records for convenient rendering. */
export function buildAssignmentRecords(): AssignmentRecord[] {
  return mockAssignments.map((assignment) => {
    const sample = mockSamples.find((s) => s.id === assignment.sampleId)!;
    const test = mockTests.find((t) => t.id === assignment.testId)!;
    const analyst = assignment.analystId
      ? mockAnalysts.find((a) => a.id === assignment.analystId) ?? null
      : null;
    const history = mockHistory.filter(
      (h) => h.assignmentId === assignment.id,
    );
    return { assignment, sample, test, analyst, history };
  });
}
