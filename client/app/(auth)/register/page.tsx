'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Mail, Lock, Eye, EyeOff, Moon, Sun, Check, X, RefreshCcw, ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { AuthService } from '@/services/auth/auth.service'
import { useRouter } from 'next/navigation'
import { useTheme } from '../ThemeContext'
import { authStorage } from '@/services/auth/auth-storage.service';
import TurnstileWidget from '@/components/TurnstileWidget'
import { useToast } from "@/contexts/ToastContext"

const authServices = new AuthService();

type Step = 'form' | 'otp' | 'done'

export default function RegisterPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { darkMode, toggleDarkMode } = useTheme()
  const [step, setStep] = useState<Step>('form')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [turnstileToken, setTurnstileToken] = useState<string>('')
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [nameFocused, setNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const passwordRules = [
    { label: 'Ít nhất 8 ký tự', test: (p: string) => p.length >= 8 },
    { label: 'Chữ hoa (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Chữ thường (a-z)', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Số (0-9)', test: (p: string) => /[0-9]/.test(p) },
    { label: 'Ký tự đặc biệt (!@#...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ]

  useEffect(() => {
    if (authStorage.isAuthenticated()) {
      showToast('Bạn đã đăng nhập!', 'info')
      router.push('/')
    }
  }, [])

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [])

  const startCooldown = (seconds = 60) => {
    setResendCooldown(seconds)
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // Bước 1: Gửi OTP về email
  const handleSendOtp = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      showToast('Vui lòng nhập đầy đủ thông tin!', 'warning')
      return
    }
    const failedRules = passwordRules.filter(r => !r.test(formData.password))
    if (failedRules.length > 0) {
      showToast(`Mật khẩu chưa đủ mạnh: ${failedRules.map(r => r.label).join(', ')}`, 'warning')
      return
    }
    setLoading(true)
    try {
      const response = await authServices.sendRegistrationOtp({ ...formData, turnstileToken })
      if (response.success) {
        setStep('otp')
        setOtp('')
        startCooldown(60)
        showToast('Mã OTP đã được gửi đến email của bạn!', 'success')
      } else {
        showToast(response.message || 'Có lỗi xảy ra!', 'error')
      }
    } catch (error: any) {
      showToast(error.message || 'Có lỗi xảy ra!', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Bước 2: Xác minh OTP và tạo tài khoản
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      showToast('Vui lòng nhập đủ 6 chữ số OTP!', 'warning')
      return
    }
    setLoading(true)
    try {
      const response = await authServices.register({ ...formData, otp })
      if (response.success) {
        if (response.authorization?.access_token) {
          authStorage.setTokens(
            response.authorization.access_token,
            response.authorization.refresh_token
          )
        }
        setStep('done')
        showToast('Tài khoản đã được tạo thành công!', 'success')
      } else {
        showToast(response.message || 'Xác minh OTP thất bại!', 'error')
      }
    } catch (error: any) {
      showToast(error.message || 'Có lỗi xảy ra!', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Gửi lại OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading) return
    setResendLoading(true)
    try {
      const response = await authServices.sendRegistrationOtp({ ...formData, turnstileToken })
      if (response.success) {
        setOtp('')
        startCooldown(60)
        showToast('Đã gửi lại mã OTP!', 'success')
      }
    } catch (error: any) {
      showToast(error.message || 'Không thể gửi lại OTP!', 'error')
    } finally {
      setResendLoading(false)
    }
  }

  const stepIndex = step === 'form' ? 0 : step === 'otp' ? 1 : 2

  return (
    <div className="w-full flex flex-col animate-fade-in">
      <div className="flex justify-end p-4">
        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white text-gray-700 hover:bg-gray-50 shadow-md"}`}
        >
          <div className="transition-transform duration-500 ease-in-out" style={{ transform: darkMode ? "rotate(0deg)" : "rotate(240deg)" }}>
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </div>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-md px-8">

          {/* ── STEP INDICATOR (3 bước) ── */}
          <div className="flex items-center gap-2 mb-8">
            {(['Thông tin', 'Xác minh', 'Hoàn tất'] as const).map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    i < stepIndex
                      ? 'bg-teal-600/20 text-teal-500'
                      : i === stepIndex
                        ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                        : darkMode ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${
                    i <= stepIndex
                      ? darkMode ? 'text-slate-300' : 'text-gray-700'
                      : darkMode ? 'text-slate-500' : 'text-gray-400'
                  }`}>{label}</span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 rounded transition-all duration-500 ${
                    i < stepIndex ? 'bg-teal-600' : darkMode ? 'bg-slate-700' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* ── STEP 1: FORM ── */}
          {step === 'form' && (
            <>
              <div className="pb-6">
                <h1 className={`text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>Đăng ký</h1>
                <p className={darkMode ? "text-slate-400" : "text-gray-600"}>Tạo tài khoản mới để bắt đầu sử dụng.</p>
              </div>

              <div className="space-y-5">
                {/* Username */}
                <div className="group">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className={`h-5 w-5 transition-all duration-300 ${nameFocused ? "text-teal-500 scale-110" : darkMode ? "text-slate-500" : "text-gray-400"}`} />
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      placeholder="Chọn username"
                      className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${darkMode
                        ? "bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20"
                        : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20"
                      }`}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="group">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className={`h-5 w-5 transition-all duration-300 ${emailFocused ? "text-teal-500 scale-110" : darkMode ? "text-slate-500" : "text-gray-400"}`} />
                    </div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder="email@example.com"
                      className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${darkMode
                        ? "bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20"
                        : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20"
                      }`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className={`h-5 w-5 transition-all duration-300 ${passwordFocused ? "text-teal-500 scale-110" : darkMode ? "text-slate-500" : "text-gray-400"}`} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      placeholder="Tạo mật khẩu"
                      className={`w-full pl-10 pr-12 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${darkMode
                        ? "bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20"
                        : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-all duration-300 hover:scale-125 ${darkMode ? "text-slate-500 hover:text-teal-500" : "text-gray-500 hover:text-teal-600"}`}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {(passwordFocused || formData.password.length > 0) && (
                    <div className={`mt-2 p-3 rounded-lg text-xs space-y-1 border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>Yêu cầu mật khẩu:</p>
                      {passwordRules.map((rule) => {
                        const passed = rule.test(formData.password)
                        return (
                          <div key={rule.label} className={`flex items-center gap-2 transition-colors ${passed ? 'text-teal-500' : darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                            {passed ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
                            <span>{rule.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <TurnstileWidget onSuccess={setTurnstileToken} theme={darkMode ? 'dark' : 'light'} />

                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-white relative overflow-hidden"
                  style={{ background: loading ? "#64748B" : "#0F766E", boxShadow: "0 10px 25px rgba(15, 118, 110, 0.3)" }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang gửi mã...
                    </span>
                  ) : 'Gửi mã xác minh'}
                </button>

                <p className={`text-center text-sm ${darkMode ? "text-slate-400" : "text-gray-600"}`}>
                  Đã có tài khoản?{" "}
                  <Link href="/login" className="font-semibold transition-colors" style={{ color: "#14B8A6" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#0F766E")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#14B8A6")}
                  >
                    Đăng nhập ngay
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 'otp' && (
            <div className="flex flex-col items-center text-center space-y-6 py-2 animate-fade-in">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${darkMode ? 'bg-teal-600/20' : 'bg-teal-50'}`}>
                <ShieldCheck className="h-8 w-8 text-teal-500" />
              </div>

              <div className="space-y-1.5">
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Xác minh email</h1>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Nhập mã 6 chữ số đã gửi đến
                </p>
                <p className={`text-sm font-semibold px-3 py-1 rounded-lg inline-block ${darkMode ? 'bg-slate-700 text-teal-400' : 'bg-teal-50 text-teal-700'}`}>
                  {formData.email}
                </p>
              </div>

              {/* OTP Input */}
              <div className="w-full">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtp(val)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  placeholder="______"
                  autoFocus
                  className={`w-full text-center text-3xl font-mono font-bold tracking-[0.5em] py-4 px-4 rounded-xl border-2 focus:outline-none transition-all duration-200 ${
                    darkMode
                      ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-600 focus:border-teal-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-300 focus:border-teal-500'
                  }`}
                />
                <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  Mã có hiệu lực trong 5 phút
                </p>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 rounded-lg font-semibold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-white"
                style={{ background: loading ? "#64748B" : "#0F766E", boxShadow: "0 10px 25px rgba(15, 118, 110, 0.3)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Đang xác minh...
                  </span>
                ) : 'Xác minh & Tạo tài khoản'}
              </button>

              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resendLoading}
                  className={`flex items-center gap-2 text-sm font-medium transition-all ${
                    resendCooldown > 0 || resendLoading
                      ? darkMode ? 'text-slate-500 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                      : darkMode ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'
                  }`}
                >
                  <RefreshCcw className={`h-4 w-4 ${resendLoading ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : resendLoading ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                </button>

                <button
                  onClick={() => setStep('form')}
                  className={`flex items-center gap-1.5 text-sm transition-all ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Quay lại
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: DONE ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center space-y-6 py-4 animate-fade-in">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${darkMode ? 'bg-teal-600/20' : 'bg-teal-50'}`}>
                <Check className="h-10 w-10 text-teal-500" />
              </div>

              <div className="space-y-2">
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Tài khoản đã được tạo!
                </h1>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Chào mừng <span className="font-semibold text-teal-500">{formData.name}</span> đến với GEN-HUB
                </p>
              </div>

              <div className={`w-full p-4 rounded-xl text-sm text-left border ${darkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-teal-50/60 border-teal-100 text-gray-600'}`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-500 shrink-0" />
                  <span>Email <strong>{formData.email}</strong> đã được xác minh thành công.</span>
                </div>
              </div>

              <div className="w-full space-y-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3 rounded-lg font-semibold text-white transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "#0F766E", boxShadow: "0 10px 25px rgba(15, 118, 110, 0.3)" }}
                >
                  Bắt đầu sử dụng
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  Đến trang đăng nhập
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
