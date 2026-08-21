import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Analyst, AssignmentRecord } from '../models/types';

interface ReassignModalProps {
  record: AssignmentRecord;
  analysts: Analyst[];
  onConfirm: (newAnalystId: string, reason: string) => Promise<void>;
  onCancel: () => void;
}

export function ReassignModal({ record, analysts, onConfirm, onCancel }: ReassignModalProps) {
  const eligibleAnalysts = useMemo(
    () => analysts.filter((analyst) => analyst.activeStatus === 'Active'),
    [analysts],
  );
  const [selectedAnalystId, setSelectedAnalystId] = useState(
    record.analyst?.id ?? eligibleAnalysts[0]?.id ?? '',
  );
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const selectedAnalyst = eligibleAnalysts.find((analyst) => analyst.id === selectedAnalystId) ?? null;

  const handleProceedToConfirm = () => {
    if (!selectedAnalystId) {
      setValidationError('Select an analyst to assign this work to.');
      return;
    }
    if (record.analyst && !reason.trim()) {
      setValidationError('Provide a reason for reassigning this work.');
      return;
    }

    setValidationError(null);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(selectedAnalystId, reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <h2 id={titleId}>{record.analyst ? 'Reassign work' : 'Assign work'}</h2>
        <p className="modal__subtitle">
          {record.test.testName} for sample {record.sample.accessionNumber}
        </p>

        {!confirming && (
          <>
            <label className="modal__field">
              <span>Analyst</span>
              <select
                value={selectedAnalystId}
                onChange={(e) => setSelectedAnalystId(e.target.value)}
                aria-label="Select analyst"
              >
                {eligibleAnalysts.length === 0 && <option value="">No active analysts</option>}
                {eligibleAnalysts.map((analyst) => (
                  <option key={analyst.id} value={analyst.id}>
                    {analyst.displayName} ({analyst.department})
                  </option>
                ))}
              </select>
            </label>
            {record.analyst && (
              <label className="modal__field">
                <span>Reason for reassignment</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-label="Reason for reassignment"
                  rows={4}
                />
              </label>
            )}
            {validationError && (
              <p role="alert" className="modal__error">
                {validationError}
              </p>
            )}
            <div className="modal__actions">
              <button type="button" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" onClick={handleProceedToConfirm}>
                Continue
              </button>
            </div>
          </>
        )}

        {confirming && (
          <>
            <p className="modal__confirmation">
              Confirm assigning <strong>{record.test.testName}</strong> to{' '}
              <strong>{selectedAnalyst?.displayName ?? 'the selected analyst'}</strong>?
            </p>
            {reason && <p className="modal__confirmation-note">Reason: {reason}</p>}
            <div className="modal__actions">
              <button type="button" onClick={() => setConfirming(false)} disabled={submitting}>
                Back
              </button>
              <button type="button" onClick={handleConfirm} disabled={submitting}>
                {submitting ? 'Confirming…' : 'Confirm'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
