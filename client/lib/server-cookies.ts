import { cookies } from 'next/headers';

// Server-side cookie utilities
export const getServerCookie = async (name: string): Promise<string | null> => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(name);
  return cookie?.value || null;
};

export const setServerCookie = async (name: string, value: string, options: {
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
} = {}) => {
  const cookieStore = await cookies();
  cookieStore.set(name, value, options);
};

export const deleteServerCookie = async (name: string) => {
  const cookieStore = await cookies();
  cookieStore.set(name, '', { 
    expires: new Date(0),
    path: '/',
  });
};
