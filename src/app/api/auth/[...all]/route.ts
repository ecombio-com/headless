// Better Auth endpoints (sign-in code, Google, session, sign-out). P1.4.
import {getAuth} from '~/server/auth';

const handle = (request: Request) => getAuth(request.url).handler(request);

export const GET = handle;
export const POST = handle;
