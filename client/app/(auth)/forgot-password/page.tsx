'use client'

import { useState, useEffect } from 'react'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import { AuthService } from '@/services/auth/auth.service'
import { useRouter } from 'next/navigation'
import { authStorage } from '@/services/auth/auth-storage.service'
import TurnstileWidget from '@/components/TurnstileWidget'

const authServices = new AuthService();
export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>('')

  useEffect(() => {
    if (authStorage.isAuthenticated()) {
      alert('Bạn đã đăng nhập!')
      router.push('/')
    }
  }, [])

  const handleSubmit = async () => {
    if (!email) {
      alert('Vui lòng nhập email!')
      return
    }

    setLoading(true)
    try {
      const res: any = authServices.forgotpassword({ email, turnstileToken })
      // BE đang trả về message (theo auth.service.ts)
      alert(res?.message || 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi!')
    } catch (err) {
      console.error(err)
      alert('Có lỗi xảy ra, vui lòng thử lại sau!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Quên mật khẩu
          </h1>
          <p className="text-slate-400">
            Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
          </p>
        </div>

        {/* Form */}
        <div className="px-8 pb-8 space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="email@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>
          </div>

          <TurnstileWidget
            onSuccess={setTurnstileToken}
            theme="dark"
          />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu đặt lại mật khẩu'}
          </button>

          {/* Back to login */}
          <p className="text-center text-slate-400 text-sm mt-6">
            Nhớ mật khẩu rồi?{' '}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}