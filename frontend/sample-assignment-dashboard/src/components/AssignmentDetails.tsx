import type { AssignmentRecord } from '../models/types';
import { formatDateTime } from '../utils/dateUtils';

/** Expanded detail panel shown when a row/card is toggled open. */
export function AssignmentDetails({ record }: { record: AssignmentRecord }) {
  return (
    <div className="assignment-details">
      <div>
        <h4>Test instructions</h4>
        <p>{record.test.instructions}</p>
        <p>
          <strong>Methodology:</strong> {record.test.methodology}
        </p>
        {record.test.requiredSkills.length > 0 && (
          <p>
            <strong>Required skills:</strong> {record.test.requiredSkills.join(', ')}
          </p>
        )}
        {record.test.blockedReason && (
          <p className="assignment-details__blocked">
            <strong>Blocked reason:</strong> {record.test.blockedReason}
          </p>
        )}
        {record.test.notes && (
          <p>
            <strong>Notes:</strong> {record.test.notes}
          </p>
        )}
      </div>
      <div>
        <h4>Sample details</h4>
        <p>
          <strong>Specimen type:</strong> {record.sample.specimenType}
        </p>
        <p>
          <strong>Location:</strong> {record.sample.location}
        </p>
        <p>
          <strong>Collected:</strong> {formatDateTime(record.sample.collectionDateTime)}
        </p>
        <p>
          <strong>Received:</strong> {formatDateTime(record.sample.receivedDateTime)}
        </p>
      </div>
      {record.history.length > 0 && (
        <div>
          <h4>Assignment history</h4>
          <ul className="assignment-details__history">
            {record.history.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.action}</strong> by {entry.performedBy} on{' '}
                {formatDateTime(entry.performedDateTime)}
                {entry.reason ? ` — ${entry.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
