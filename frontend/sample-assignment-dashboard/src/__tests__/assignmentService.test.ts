import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssignmentServiceError,
  fetchAnalysts,
  fetchAssignmentRecords,
  reassignTest,
} from '../api/assignmentService';
import { analystsFixture, buildAssignmentRecordsFixture } from '../test/fixtures';

describe('assignmentService', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    window.__ASSIGNMENT_DASHBOARD_CSRF__ = 'csrf-token';
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    delete window.__ASSIGNMENT_DASHBOARD_CSRF__;
  });

  it('fetches assignment records', async () => {
    const records = buildAssignmentRecordsFixture();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ records }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(fetchAssignmentRecords()).resolves.toEqual(records);
    expect(fetchMock).toHaveBeenCalledWith('/api/assignments/records', {
      credentials: 'same-origin',
    });
  });

  it('fetches analysts', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ analysts: analystsFixture }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(fetchAnalysts()).resolves.toEqual(analystsFixture);
    expect(fetchMock).toHaveBeenCalledWith('/api/assignments/analysts', {
      credentials: 'same-origin',
    });
  });

  it('reassigns work with csrf and same-origin credentials', async () => {
    const record = buildAssignmentRecordsFixture()[0];
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ record }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      reassignTest({ assignmentId: 'assignment-1', newAnalystId: '4', reason: 'Balance workload' }),
    ).resolves.toEqual(record);

    expect(fetchMock).toHaveBeenCalledWith('/api/assignments/assignment-1/reassign', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': 'csrf-token',
      },
      body: JSON.stringify({ newAnalystId: '4', reason: 'Balance workload' }),
    });
  });

  it('uses the server error message when present', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Assignment not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(fetchAssignmentRecords()).rejects.toThrow('Assignment not found.');
  });

  it('throws a friendly error on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network down'));

    try {
      await fetchAnalysts();
      throw new Error('Expected fetchAnalysts to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AssignmentServiceError);
      expect(error).toMatchObject({ message: 'Network down' });
    }
  });
});
