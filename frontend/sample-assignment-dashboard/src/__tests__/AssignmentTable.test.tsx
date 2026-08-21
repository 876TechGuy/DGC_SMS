import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AssignmentTable } from '../components/AssignmentTable';
import type { AssignmentRecord } from '../models/types';
import { analystsFixture, buildAssignmentRecordsFixture, supervisorUser } from '../test/fixtures';

function buildManyRecords(count: number): AssignmentRecord[] {
  const [template] = buildAssignmentRecordsFixture();
  return Array.from({ length: count }, (_, index) => ({
    ...template,
    assignment: { ...template.assignment, id: `assignment-page-${index}` },
    sample: { ...template.sample, accessionNumber: `FOOD-${index.toString().padStart(3, '0')}` },
    analyst: analystsFixture[0],
  }));
}

describe('AssignmentTable pagination', () => {
  it('shows only the first page of records and paginates on click', async () => {
    const user = userEvent.setup();
    const records = buildManyRecords(12);

    render(
      <AssignmentTable currentUser={supervisorUser} records={records} onReassign={vi.fn()} />,
    );

    expect(screen.getAllByText('FOOD-000').length).toBeGreaterThan(0);
    expect(screen.queryByText('FOOD-008')).not.toBeInTheDocument();
    expect(screen.getAllByText(/page 1 of 2/i).length).toBeGreaterThan(0);

    const nextButtons = screen.getAllByRole('button', { name: /^next$/i });
    for (const button of nextButtons) {
      await user.click(button);
    }

    expect(screen.getAllByText('FOOD-008').length).toBeGreaterThan(0);
    expect(screen.queryByText('FOOD-000')).not.toBeInTheDocument();
    expect(screen.getAllByText(/page 2 of 2/i).length).toBeGreaterThan(0);
  });

  it('does not render pagination controls when everything fits on one page', () => {
    const records = buildManyRecords(3);

    render(
      <AssignmentTable currentUser={supervisorUser} records={records} onReassign={vi.fn()} />,
    );

    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });
});
