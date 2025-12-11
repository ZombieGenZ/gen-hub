'use client'

import { useEffect } from "react";
import Image from "next/image";
import { UserService } from "@/services/user/user.service";
import { AuthService } from "@/services/auth/auth.service";

export default function Home() {
  const userServices = new UserService();
  const authServices = new AuthService();

    useEffect(() => {
    const access_token = localStorage.getItem('access_token');
    if (access_token) {
      userServices.getUser(access_token).then((response) => {
        console.log(response);
      });
    }
  }, []);

  // useEffect mới: kiểm tra refresh_token mỗi 5 phút
  useEffect(() => {
    const interval = setInterval(async () => {
      const refresh_token = localStorage.getItem('refresh_token');
      if (!refresh_token) return;

      try {
        const response = await authServices.getNewToken(refresh_token);
        // tuỳ backend, bạn có thể cần gửi refresh_token trong body:
        // const response = await authServices.getNewToken(refresh_token)
        console.log(response)
        if (response) {
          localStorage.setItem('access_token', response.authorization.access_token);
          if (response.authorization.refresh_token) {
            localStorage.setItem('refresh_token', response.authorization.refresh_token);
          }
          console.log('Refreshed token:', response.authorization.access_token);
        } else {
          console.warn('Refresh token failed', response);
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    }, 5 * 60 * 1000); // 5 phút

    return () => clearInterval(interval);
  }, [authServices]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/8 px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
