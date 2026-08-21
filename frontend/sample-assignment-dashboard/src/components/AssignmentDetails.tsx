import type { AssignmentRecord } from '../models/types';
import { formatDateTime } from '../utils/dateUtils';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="assignment-details__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function AssignmentDetails({ record }: { record: AssignmentRecord }) {
  return (
    <div className="assignment-details">
      <section className="assignment-details__section">
        <h4>Sample details</h4>
        <dl className="assignment-details__grid">
          <DetailRow label="Sample name" value={record.sample.sampleName} />
          <DetailRow label="Sample type" value={record.sample.sampleType} />
          <DetailRow label="Location" value={record.sample.location ?? '—'} />
          <DetailRow
            label="Received date"
            value={formatDateTime(record.sample.receivedDateTime)}
          />
        </dl>
      </section>

      <section className="assignment-details__section">
        <h4>Assignment details</h4>
        <dl className="assignment-details__grid">
          <DetailRow label="Assigned by" value={record.assignment.assignedByName ?? '—'} />
          <DetailRow
            label="Assigned date"
            value={formatDateTime(record.assignment.assignedDateTime)}
          />
          <DetailRow label="Test reference" value={record.test.testReference ?? '—'} />
          <DetailRow label="Work item" value={record.test.workItemUrl} />
        </dl>
      </section>

      <section className="assignment-details__section">
        <h4>History</h4>
        {record.history.length === 0 ? (
          <p className="assignment-details__empty">No assignment history yet.</p>
        ) : (
          <ul className="assignment-details__history">
            {record.history.map((entry) => (
              <li key={entry.id}>
                <div className="assignment-details__history-header">
                  <strong>{entry.action}</strong>
                  <span>{formatDateTime(entry.performedDateTime)}</span>
                </div>
                {entry.details && <p>{entry.details}</p>}
                {entry.performedBy && (
                  <p className="assignment-details__history-meta">
                    Performed by {entry.performedBy}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
