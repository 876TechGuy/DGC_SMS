/// <reference types="vite/client" />

import type { AuthenticatedUser } from './models/types';

declare global {
  interface Window {
    __ASSIGNMENT_DASHBOARD_USER__?: AuthenticatedUser;
    __ASSIGNMENT_DASHBOARD_CSRF__?: string;
  }
}

export {};
