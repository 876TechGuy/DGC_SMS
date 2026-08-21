import type { Analyst, AssignmentRecord } from '../models/types';

export class AssignmentServiceError extends Error {}

export interface ReassignInput {
  assignmentId: string;
  newAnalystId: string;
  reason: string;
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function friendlyMessage(error: unknown, fallback: string): string {
  if (error instanceof AssignmentServiceError) return error.message;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch (error) {
    throw new AssignmentServiceError(friendlyMessage(error, 'Unable to connect to the assignment service.'));
  }

  const payload = await parseJson<{ error?: string } & T>(response);

  if (!response.ok) {
    throw new AssignmentServiceError(
      payload?.error || `Assignment service request failed (${response.status}).`,
    );
  }

  if (!payload) {
    throw new AssignmentServiceError('Assignment service returned an empty response.');
  }

  return payload;
}

export async function fetchAssignmentRecords(): Promise<AssignmentRecord[]> {
  const data = await requestJson<{ records: AssignmentRecord[] }>('/api/assignments/records', {
    credentials: 'same-origin',
  });
  return data.records;
}

export async function fetchAnalysts(): Promise<Analyst[]> {
  const data = await requestJson<{ analysts: Analyst[] }>('/api/assignments/analysts', {
    credentials: 'same-origin',
  });
  return data.analysts;
}

export async function reassignTest(input: ReassignInput): Promise<AssignmentRecord> {
  const data = await requestJson<{ record: AssignmentRecord }>(
    `/api/assignments/${input.assignmentId}/reassign`,
    {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.__ASSIGNMENT_DASHBOARD_CSRF__ ?? '',
      },
      body: JSON.stringify({
        newAnalystId: input.newAnalystId,
        reason: input.reason,
      }),
    },
  );

  return data.record;
}
