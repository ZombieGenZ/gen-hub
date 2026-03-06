'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { AuthService } from '@/services/auth/auth.service'
import { useToast } from "@/contexts/ToastContext"

const authServices = new AuthService()

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const [isCheckingToken, setIsCheckingToken] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = searchParams.get('token')
    if (!t) {
      // Không có token -> chuyển sang trang 404
      router.replace('/error')
      console.error('token không hợp lệ hoặc không có token!', 'error')
      return
    }
    try {
      const res: any = authServices.checkToken(t)
      if (res) {
        setToken(t)
        setIsCheckingToken(false)
      }
    } catch (error) {
      console.error(error)
      showToast('Có lỗi xảy ra, vui lòng thử lại sau!', 'error')
    }
  }, [searchParams, router, showToast])

  // Nếu BE yêu cầu token từ query (?token=...), bạn có thể lấy bằng useSearchParams ở đây
  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      showToast('Vui lòng nhập đầy đủ thông tin!', 'warning')
      return
    }

    if (password !== confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp!', 'warning')
      return
    }

    if (!token) {
      showToast('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn!', 'error')
      router.replace('/error')
      return
    }

    setLoading(true)
    try {
      // TODO: chỉnh lại body theo API reset password của bạn
      const res = await authServices.changePass({
        new_password: password,
        confirm_password: confirmPassword,
        logout_all_devices: true,
        token,
      })

      if (res) {
        showToast(res?.message || 'Đổi mật khẩu thành công, hãy đăng nhập lại!', 'success')
        // Ví dụ: chuyển về trang login
        router.push('/login')
      } else {
        showToast(res?.message || 'Đổi mật khẩu thất bại!', 'error')
      }
    } catch (error) {
      console.error(error)
      showToast('Có lỗi xảy ra, vui lòng thử lại sau!', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Trong lúc đang kiểm tra token thì chưa render form
  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Đang kiểm tra liên kết đặt lại mật khẩu...
        </h1>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Đặt lại mật khẩu
          </h1>
          <p className="text-slate-400">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        {/* Form */}
        <div className="px-8 pb-8 space-y-5">
          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Mật khẩu mới
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Nhập mật khẩu mới"
                className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>

          {/* Back to login */}
          <p className="text-center text-slate-400 text-sm mt-6">
            Quay lại{' '}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              trang đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Đang tải...
        </h1>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}