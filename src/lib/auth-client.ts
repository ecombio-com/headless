'use client';
// Browser side of Better Auth. Calls /api/auth on the current origin (auth.<brand>.com live).
import {createAuthClient} from 'better-auth/react';
import {emailOTPClient} from 'better-auth/client/plugins';

export const authClient = createAuthClient({plugins: [emailOTPClient()]});
