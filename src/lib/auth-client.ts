'use client';
// Browser side of Better Auth: credentials sign-in against /api/auth on the current origin.
import {createAuthClient} from 'better-auth/react';

export const authClient = createAuthClient();
