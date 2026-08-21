import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SampleAssignmentDashboard } from '../components/SampleAssignmentDashboard';
import {
  analystsFixture,
  analystReidUser,
  buildAssignmentRecordsFixture,
  supervisorUser,
} from '../test/fixtures';
import {
  fetchAnalysts,
  fetchAssignmentRecords,
  reassignTest,
} from '../api/assignmentService';

vi.mock('../api/assignmentService', () => ({
  fetchAssignmentRecords: vi.fn(),
  fetchAnalysts: vi.fn(),
  reassignTest: vi.fn(),
}));

describe('SampleAssignmentDashboard', () => {
  const records = buildAssignmentRecordsFixture();

  beforeEach(() => {
    vi.mocked(fetchAssignmentRecords).mockResolvedValue(records);
    vi.mocked(fetchAnalysts).mockResolvedValue(analystsFixture);
    vi.mocked(reassignTest).mockResolvedValue(records[0]);
  });

  it('shows the no-permission state for an unrecognised role', () => {
    render(
      <SampleAssignmentDashboard
        currentUser={{ ...analystReidUser, role: 'auditor' } as unknown as typeof analystReidUser}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/do not have permission/i);
  });

  it('supervisor view groups assignments by analyst and shows all tests', async () => {
    render(<SampleAssignmentDashboard currentUser={supervisorUser} />);

    await waitFor(() => expect(fetchAssignmentRecords).toHaveBeenCalled());

    expect(screen.getByRole('heading', { name: 'A. Reid' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'B. Campbell' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Unassigned' })).toBeInTheDocument();
  });

  it('analyst view only shows that analyst\'s own assignments', async () => {
    render(<SampleAssignmentDashboard currentUser={analystReidUser} />);

    await waitFor(() => expect(fetchAssignmentRecords).toHaveBeenCalled());

    expect(screen.getAllByText('Fat Content').length).toBeGreaterThan(0);
    expect(screen.queryByText('Blood Alcohol')).not.toBeInTheDocument();
    expect(screen.queryByText('Dissolution')).not.toBeInTheDocument();
  });

  it('filters supervisor view by status', async () => {
    const user = userEvent.setup();
    render(<SampleAssignmentDashboard currentUser={supervisorUser} />);

    await waitFor(() => expect(fetchAssignmentRecords).toHaveBeenCalled());
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'Completed');

    expect(screen.getAllByText('Blood Alcohol').length).toBeGreaterThan(0);
    expect(screen.queryByText('Fat Content')).not.toBeInTheDocument();
  });

  it('renders an open work item link with the correct href', async () => {
    render(<SampleAssignmentDashboard currentUser={analystReidUser} />);

    await waitFor(() => expect(fetchAssignmentRecords).toHaveBeenCalled());

    const link = screen.getAllByRole('link', { name: /open work item/i })[0];
    expect(link).toHaveAttribute('href', '/samples/assignment/12');
  });

  it('opens the reassign modal and submits reassignment for supervisors', async () => {
    const user = userEvent.setup();
    render(<SampleAssignmentDashboard currentUser={supervisorUser} />);

    await waitFor(() => expect(fetchAssignmentRecords).toHaveBeenCalled());

    const analystSection = screen.getByRole('region', { name: 'A. Reid' });
    const table = within(analystSection).getByRole('table');
    const row = within(table).getByText('Fat Content').closest('tr');
    expect(row).not.toBeNull();

    await user.click(within(row!).getByRole('button', { name: /reassign/i }));
    await user.selectOptions(screen.getByLabelText('Select analyst'), '4');
    await user.type(screen.getByLabelText('Reason for reassignment'), 'Shift coverage');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() =>
      expect(reassignTest).toHaveBeenCalledWith({
        assignmentId: 'assignment-1',
        newAnalystId: '4',
        reason: 'Shift coverage',
      }),
    );
  });
});
