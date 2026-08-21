import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { SampleAssignmentDashboard } from './components/SampleAssignmentDashboard';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Assignment dashboard root element not found.');
}

createRoot(root).render(
  <StrictMode>
    {window.__ASSIGNMENT_DASHBOARD_USER__ ? (
      <SampleAssignmentDashboard currentUser={window.__ASSIGNMENT_DASHBOARD_USER__} />
    ) : (
      <App />
    )}
  </StrictMode>,
);
