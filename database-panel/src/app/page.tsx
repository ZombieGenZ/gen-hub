'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Database, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { login, verify2FA, isLoading, isAuthenticated } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (requires2FA) {
        if (!twoFactorCode) {
          setError('Vui lòng nhập mã xác thực');
          return;
        }
        await verify2FA(tempToken, isBackupCode ? undefined : twoFactorCode, isBackupCode ? twoFactorCode : undefined);
      } else {
        if (!email || !password) {
          setError('Vui lòng nhập đầy đủ thông tin');
          return;
        }
        const response = await login(email, password);
        if (response?.data?.requires_2fa) {
          setRequires2FA(true);
          setTempToken(response.data.temp_token || '');
        }
      }
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (error.message === 'PERMISSION_DENIED') {
        setError('Bạn không có quyền truy cập Database Panel');
      } else if (error.response?.status === 403) {
        setError('Bạn không có quyền truy cập Database Panel');
      } else if (error.response?.status === 401) {
        setError('Thông tin đăng nhập không chính xác');
      } else {
        setError(error.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent-primary)] opacity-5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--accent-primary)] opacity-5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--accent-primary-muted)] mb-4 glow">
            <Database className="w-10 h-10 text-[var(--accent-primary)]" />
          </div>
          <h1 className="text-3xl font-bold text-white glow-text">GEN-HUB</h1>
          <p className="text-[var(--text-secondary)] mt-2">{t('sidebar.title')}</p>
        </div>

        {/* Login Card */}
        <div className="card animate-fadeIn">
          <h2 className="text-xl font-semibold text-white mb-6">
            {requires2FA ? 'Xác thực 2 yếu tố' : 'Đăng nhập'}
          </h2>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(255,82,82,0.1)] border border-[var(--status-error)] mb-4">
              <AlertCircle className="w-5 h-5 text-[var(--status-error)]" />
              <span className="text-sm text-[var(--status-error)]">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {requires2FA ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  {isBackupCode
                    ? 'Nhập mã dự phòng của bạn để tiếp tục.'
                    : 'Nhập mã xác thực từ ứng dụng Authenticator của bạn.'}
                </p>

                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">
                    {isBackupCode ? 'Mã dự phòng' : 'Mã xác thực'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder={isBackupCode ? "ABCD1234" : "123456"}
                      className="input pl-10 tracking-widest"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBackupCode(!isBackupCode);
                      setTwoFactorCode('');
                      setError('');
                    }}
                    className="text-xs text-[var(--accent-primary)] hover:underline"
                  >
                    {isBackupCode ? 'Sử dụng mã Authenticator' : 'Sử dụng mã dự phòng'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">{t('dashboard.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="input pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{requires2FA ? 'Đang xác thực...' : 'Đang đăng nhập...'}</span>
                </>
              ) : (
                <span>{requires2FA ? 'Xác minh' : 'Đăng nhập'}</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-8">
          © {new Date().getFullYear()} GEN-HUB. All rights reserved.
        </p>
      </div>
    </div>
  );
}
