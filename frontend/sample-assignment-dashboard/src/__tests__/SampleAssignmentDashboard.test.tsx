import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SampleAssignmentDashboard } from '../components/SampleAssignmentDashboard';
import { __resetForTesting } from '../api/assignmentService';
import type { AuthenticatedUser } from '../models/types';

const supervisor: AuthenticatedUser = {
  id: 'supervisor-1',
  displayName: 'Supervisor',
  role: 'supervisor',
  canManageAssignments: true,
  canViewSensitiveData: true,
};

const analystReid: AuthenticatedUser = {
  id: 'analyst-1',
  displayName: 'A. Reid',
  role: 'analyst',
  canManageAssignments: false,
  canViewSensitiveData: false,
};

describe('SampleAssignmentDashboard', () => {
  beforeEach(() => {
    __resetForTesting();
  });

  it('shows the no-permission state for an unrecognised role', () => {
    render(
      <SampleAssignmentDashboard
        currentUser={{ ...analystReid, role: 'auditor' } as unknown as AuthenticatedUser}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/do not have permission/i);
  });

  it('supervisor view groups assignments by analyst and shows all tests', async () => {
    render(<SampleAssignmentDashboard currentUser={supervisor} />);
    await waitFor(() => expect(screen.queryByText(/Loading assignments/i)).not.toBeInTheDocument());

    expect(screen.getAllByText('A. Reid').length).toBeGreaterThan(0);
    expect(screen.getAllByText('B. Campbell').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0);
  });

  it('analyst view only shows that analyst\'s own assignments', async () => {
    render(<SampleAssignmentDashboard currentUser={analystReid} />);
    await waitFor(() => expect(screen.queryByText(/Loading assignments/i)).not.toBeInTheDocument());

    expect(screen.getAllByText('GC-MS Screen').length).toBeGreaterThan(0);
    expect(screen.queryByText('Dissolution')).not.toBeInTheDocument();
    expect(screen.queryByText('Fat Content')).not.toBeInTheDocument();
  });

  it('filters supervisor view by status', async () => {
    const user = userEvent.setup();
    render(<SampleAssignmentDashboard currentUser={supervisor} />);
    await waitFor(() => expect(screen.queryByText(/Loading assignments/i)).not.toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'Completed');
    expect(screen.getAllByText('Blood Alcohol').length).toBeGreaterThan(0);
    expect(screen.queryByText('Dissolution')).not.toBeInTheDocument();
  });

  it('allows an analyst to accept and advance an assignment status', async () => {
    const user = userEvent.setup();
    render(<SampleAssignmentDashboard currentUser={analystReid} />);
    await waitFor(() => expect(screen.queryByText(/Loading assignments/i)).not.toBeInTheDocument());

    const table = screen.getByRole('table');
    const row = within(table).getByText('GC-MS Screen').closest('tr')!;
    expect(within(row).getByText('In Progress')).toBeInTheDocument();

    const holdButtons = within(row).getAllByRole('button', { name: /put on hold/i });
    await user.click(holdButtons[0]);
    const reasonInput = within(row).getByLabelText('Reason for hold');
    await user.type(reasonInput, 'Instrument recalibration');
    await user.click(within(row).getByRole('button', { name: /confirm hold/i }));

    await waitFor(() => expect(within(row).getByText('On Hold')).toBeInTheDocument());
  });
});
