import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReassignModal } from '../components/ReassignModal';
import { analystsFixture, buildAssignmentRecordsFixture } from '../test/fixtures';

describe('ReassignModal', () => {
  it('surfaces a reassignment error inside the modal instead of hiding it', async () => {
    const user = userEvent.setup();
    const [record] = buildAssignmentRecordsFixture();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ReassignModal
        record={record}
        analysts={analystsFixture}
        error={null}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Select analyst'), '4');
    await user.type(screen.getByLabelText('Reason for reassignment'), 'Shift coverage');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));

    expect(onConfirm).toHaveBeenCalled();

    // Simulate the parent surfacing a failed reassignment attempt.
    rerender(
      <ReassignModal
        record={record}
        analysts={analystsFixture}
        error="Selected analyst is unavailable."
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Selected analyst is unavailable.');
    // The form should be visible again so the user can correct and retry.
    expect(screen.getByLabelText('Select analyst')).toBeInTheDocument();
  });

  it('closes when the Escape key is pressed', async () => {
    const user = userEvent.setup();
    const [record] = buildAssignmentRecordsFixture();
    const onCancel = vi.fn();

    render(
      <ReassignModal
        record={record}
        analysts={analystsFixture}
        error={null}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalled();
  });
});
