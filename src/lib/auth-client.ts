'use client';
// Browser side of Better Auth: email code + Google against /api/auth on the current origin (auth.<brand>.com).
import {createAuthClient} from 'better-auth/react';
import {emailOTPClient} from 'better-auth/client/plugins';

export const authClient = createAuthClient({plugins: [emailOTPClient()]});