
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SECRET_KEY = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-prod';
const key = new TextEncoder().encode(SECRET_KEY);

const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(key);
}

export async function decrypt(input: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function createSession(user: { id: string; username: string; role: string; storeId: string; fullName: string }) {
    const expires = new Date(Date.now() + SESSION_DURATION);
    const session = await encrypt({ user, expires });

    cookies().set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires,
        sameSite: 'lax',
        path: '/',
    });
}

export async function getSession() {
    const session = cookies().get('session')?.value;
    if (!session) return null;
    return await decrypt(session);
}

export async function logout() {
    cookies().set('session', '', { expires: new Date(0) });
}

export async function getSessionFromRequest(request: NextRequest) {
    const session = request.cookies.get('session')?.value;
    if (!session) return null;
    return await decrypt(session);
}
