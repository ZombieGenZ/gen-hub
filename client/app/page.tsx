'use client'

import { useState, useEffect } from "react";
import Image from "next/image";
import { UserService } from "@/services/user/user.service";
import { AuthService } from "@/services/auth/auth.service";

export default function Home() {
  const userServices = new UserService();
  const authServices = new AuthService();
  const [isEmailConfirmed, setIsEmailConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    const access_token = localStorage.getItem('access_token');
    if (access_token) {
      userServices.getUser(access_token).then((response: any) => {
        console.log(response);
        setIsEmailConfirmed(response.user.email_confirmed);
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

  const handleVerifyEmail = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const response = await authServices.confirmToken(token)
      if (response) {
        alert("Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư của bạn.");
      }
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi gửi email xác minh. Vui lòng thử lại sau.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 font-sans">
      <main className="w-full max-w-2xl px-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-2xl p-8 md:p-10">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Gen Hub
            </h1>
            <p className="text-slate-400">
              Nơi quản lý tài khoản và trải nghiệm các tính năng AI của bạn.
            </p>
          </div>

          {/* Banner chưa xác minh email */}
          {isEmailConfirmed === false && (
            <div className="mb-6 w-full rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
              <p className="mb-2">
                Email của bạn chưa được xác minh. Vui lòng xác minh tài khoản để sử dụng đầy đủ tính năng.
              </p>
              <button
                onClick={handleVerifyEmail}
                className="inline-flex items-center rounded-md bg-yellow-500 px-3 py-1 text-xs font-semibold text-white hover:bg-yellow-600 transition-colors"
              >
                Gửi lại email xác minh
              </button>
            </div>
          )}

          {/* Nội dung chính */}
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-semibold text-white">
              Chào mừng bạn đến với Gen Hub
            </h2>
            <p className="text-slate-400">
              Sau khi đăng nhập và xác minh email, bạn có thể quản lý hồ sơ cá nhân, cài đặt bảo mật
              và khám phá các dịch vụ được tích hợp.
            </p>
          </div>

          {/* Hành động */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/user/profile"
              className="inline-flex justify-center items-center px-5 py-3 rounded-lg text-sm font-semibold text-white transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
                boxShadow: "0 10px 25px rgba(15, 118, 110, 0.35)",
              }}
            >
              Đi đến hồ sơ cá nhân
            </a>
            <a
              href="/login"
              className="inline-flex justify-center items-center px-5 py-3 rounded-lg text-sm font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Đăng nhập / Đăng ký
            </a>
          </div>
        </div>

        {/* Footer nhỏ cho đồng bộ */}
        <div className="mt-4 text-center text-xs text-slate-500">
          © 2025 Gen Hub. All rights reserved.
        </div>
      </main>
    </div>
  );
}
