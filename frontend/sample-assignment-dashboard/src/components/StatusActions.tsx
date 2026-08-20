import { useState } from 'react';
import type { AssignmentRecord, AssignmentStatus } from '../models/types';

interface StatusActionsProps {
  record: AssignmentRecord;
  onUpdateStatus: (status: AssignmentStatus, blockedReason?: string) => void;
}

const NEXT_STATUS: Partial<Record<AssignmentStatus, AssignmentStatus>> = {
  Assigned: 'In Progress',
  'In Progress': 'Completed',
};

/** Lets an analyst accept/advance, put on hold, or escalate their own assignment. */
export function StatusActions({ record, onUpdateStatus }: StatusActionsProps) {
  const [holdReason, setHoldReason] = useState('');
  const [showHoldInput, setShowHoldInput] = useState(false);

  const status = record.assignment.status;
  const nextStatus = NEXT_STATUS[status];
  const isTerminal = status === 'Completed' || status === 'Escalated';

  if (isTerminal) {
    return <span className="assignment-actions__done">No further action needed</span>;
  }

  return (
    <div className="assignment-actions">
      {nextStatus && (
        <button type="button" onClick={() => onUpdateStatus(nextStatus)}>
          {status === 'Assigned' ? 'Accept & start' : `Mark ${nextStatus}`}
        </button>
      )}
      {!showHoldInput && (
        <button type="button" onClick={() => setShowHoldInput(true)}>
          Put on hold
        </button>
      )}
      {showHoldInput && (
        <span className="assignment-actions__hold">
          <label>
            <span className="sr-only">Reason for hold</span>
            <input
              type="text"
              value={holdReason}
              placeholder="Reason for hold"
              onChange={(e) => setHoldReason(e.target.value)}
              aria-label="Reason for hold"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!holdReason.trim()) return;
              onUpdateStatus('On Hold', holdReason.trim());
              setShowHoldInput(false);
              setHoldReason('');
            }}
          >
            Confirm hold
          </button>
        </span>
      )}
      <button type="button" onClick={() => onUpdateStatus('Escalated')}>
        Escalate
      </button>
    </div>
  );
}
