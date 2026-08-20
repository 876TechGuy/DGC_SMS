import { useEffect, useId, useRef, useState } from 'react';
import type { Analyst, AssignmentRecord } from '../models/types';

interface ReassignModalProps {
  record: AssignmentRecord;
  analysts: Analyst[];
  onConfirm: (newAnalystId: string, reason: string) => Promise<void>;
  onCancel: () => void;
}

/** Modal requiring an explicit confirmation step before reassigning work. */
export function ReassignModal({ record, analysts, onConfirm, onCancel }: ReassignModalProps) {
  const [selectedAnalystId, setSelectedAnalystId] = useState(
    record.analyst?.id ?? analysts[0]?.id ?? '',
  );
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog when it mounts so keyboard/screen reader
  // users aren't left interacting with content behind the modal.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const eligibleAnalysts = analysts.filter(
    (a) => a.activeStatus === 'Active' && a.permittedTestTypes.includes(record.test.testName),
  );

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
        <p>
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
                {eligibleAnalysts.length === 0 && <option value="">No eligible analysts</option>}
                {eligibleAnalysts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName} ({a.department})
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
              <strong>
                {eligibleAnalysts.find((a) => a.id === selectedAnalystId)?.displayName}
              </strong>
              ?
            </p>
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
