import type { UserCredentials } from '../types/user-credentials';

export const USERS: Record<string, UserCredentials> = {
  demoUser: {
    username: 'demo',
    password: 'demo'
  },
  otherUser: {
    username: 'other',
    password: 'other'
  }
};