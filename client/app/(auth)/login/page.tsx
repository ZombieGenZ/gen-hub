"use client"

import { useState, useEffect } from "react"
import { User, Lock, Eye, EyeOff, Moon, Sun, Key } from "lucide-react"
import Link from "next/link"
import { AuthService } from '@/services/auth/auth.service'
import { useRouter } from "next/navigation"
import { useTheme } from "@/app/(auth)/ThemeContext"
import { authStorage } from '@/services/auth/auth-storage.service'
import TurnstileWidget from '@/components/TurnstileWidget'
import { useToast } from "@/contexts/ToastContext"

const authServices = new AuthService()

export default function LoginPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { darkMode, toggleDarkMode } = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [requires_2fa, setRequires2FA] = useState<boolean>(authStorage.getRequies2fa() == 'true' || false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    two_factor_code: "",
    backup_code: ""
  })
  const [turnstileToken, setTurnstileToken] = useState<string>('')

  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const temp_token = authStorage.getTempToken()

  useEffect(() => {
    if (authStorage.isAuthenticated()) {
      showToast('Bạn đã đăng nhập!', 'info')
      router.push('/')
    }
  }, [router, showToast])

  const handleLogin = async () => {
    setLoading(true)
    try {
      // Call API login
      const response = await authServices.login({
        email: formData.email,
        password: formData.password,
        turnstileToken
      })
      if (response && response.data.requires_2fa) {
        setRequires2FA(true)
        showToast('Vui lòng nhập mã xác thực 2 yếu tố', 'info')
        return
      }

      if (response) {
        authStorage.setTokens(
          response.authorization.access_token,
          response.authorization.refresh_token
        )
        showToast("Đăng nhập thành công!", 'success')
        router.push("/")
      } else {
        showToast("Đăng nhập thất bại!", 'error')
      }
    } catch (error: any) {
      console.error("Login error:", error)
      showToast(error.message || "Có lỗi xảy ra!", 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLoginbyTwoFactorCode = async () => {
    setLoading(true)
    try {
      const response = await authServices.login2fa(temp_token!, formData.two_factor_code, formData.backup_code)
      if (response.success) {
        showToast("Đăng nhập thành công!", 'success')
        router.push("/")
      } else {
        showToast("Đăng nhập thất bại!", 'error')
      }
    } catch (error: any) {
      console.error("Login error:", error)
      showToast(error.message || "Có lỗi xảy ra!", 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex flex-col animate-fade-in">
      <div className="flex justify-end p-4">
        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white text-gray-700 hover:bg-gray-50 shadow-md"}`}
        >
          <div
            className="transition-transform duration-500 ease-in-out"
            style={{ transform: darkMode ? "rotate(0deg)" : "rotate(180deg)" }}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </div>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-md px-8">
          {/* Header */}
          <div className="pb-6">
            <h1 className={`text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>Đăng nhập</h1>
            <p className={darkMode ? "text-slate-400" : "text-gray-600"}>Chào mừng trở lại! Đăng nhập để tiếp tục.</p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Email/Username */}
            <div className="group">
              <label className={`block text-sm font-medium mb-2 transition-colors ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                Email hoặc Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User
                    className={`h-5 w-5 transition-all duration-300 ${emailFocused ? "text-teal-500 scale-110" : darkMode ? "text-slate-500" : "text-gray-400"
                      }`}
                    style={{
                      animation: emailFocused ? "bounce-subtle 0.5s ease-in-out" : "none",
                    }}
                  />
                </div>
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="Nhập email hoặc username"
                  className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${darkMode
                    ? "bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20"
                    : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20"
                    }`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="group">
              <label className={`block text-sm font-medium mb-2 transition-colors ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock
                    className={`h-5 w-5 transition-all duration-300 ${passwordFocused ? "text-teal-500 scale-110" : darkMode ? "text-slate-500" : "text-gray-400"
                      }`}
                    style={{
                      animation: passwordFocused ? "shake-subtle 0.5s ease-in-out" : "none",
                    }}
                  />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="Nhập mật khẩu"
                  className={`w-full pl-10 pr-12 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${darkMode
                    ? "bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20"
                    : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-all duration-300 hover:scale-125 ${darkMode ? "text-slate-500 hover:text-teal-500" : "text-gray-500 hover:text-teal-600"
                    }`}
                >
                  <div className="transition-all duration-300" style={{ animation: "blink 0.3s ease-in-out" }}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </div>
                </button>
              </div>
            </div>

            {/* 2FA Input Fields */}
            {requires_2fa && (
              <div className="space-y-5 mt-4">
                <div className="group">
                  <label className={`block text-sm font-medium mb-2 transition-colors ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                    Mã xác thực 2 yếu tố <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock
                        className={`h-5 w-5 transition-all duration-300 ${darkMode ? "text-slate-500" : "text-gray-400"}`}
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.two_factor_code}
                      onChange={(e) => setFormData({ ...formData, two_factor_code: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder="Nhập mã xác thực 2FA"
                      className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${darkMode
                          ? "bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20"
                          : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20"
                        }`}
                    />
                  </div>
                </div>
                <div className="group">
                  <label className={`block text-sm font-medium mb-2 transition-colors ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                    Hoặc mã dự phòng
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key
                        className={`h-5 w-5 transition-all duration-300 ${darkMode ? "text-slate-500" : "text-gray-400"}`}
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.backup_code}
                      onChange={(e) => setFormData({ ...formData, backup_code: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder="Nhập mã dự phòng"
                      className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${darkMode
                          ? "bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20"
                          : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20"
                        }`}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 transition-all duration-300 flex items-center justify-center ${rememberMe
                      ? "bg-teal-600 border-teal-600 scale-110"
                      : darkMode
                        ? "border-slate-600 hover:border-teal-600"
                        : "border-gray-400 hover:border-teal-600"
                      }`}
                  >
                    {rememberMe && (
                      <svg
                        className="w-3 h-3 text-white animate-check-pop"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
                <span
                  className={`ml-2 text-sm transition-colors ${darkMode ? "text-slate-400 group-hover:text-slate-300" : "text-gray-600 group-hover:text-gray-800"}`}
                >
                  Ghi nhớ đăng nhập
                </span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium transition-colors"
                style={{ color: "#14B8A6" }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#0F766E")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#14B8A6")}
              >
                Quên mật khẩu?
              </Link>
            </div>

            <TurnstileWidget
              onSuccess={setTurnstileToken}
              theme={darkMode ? 'dark' : 'light'}
            />

            <button
              onClick={requires_2fa ? handleLoginbyTwoFactorCode : handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-white relative overflow-hidden"
              style={{
                background: loading ? "#64748B" : "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
                boxShadow: "0 10px 25px rgba(15, 118, 110, 0.3)",
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.boxShadow = "0 15px 35px rgba(15, 118, 110, 0.4)")}
              onMouseOut={(e) => !loading && (e.currentTarget.style.boxShadow = "0 10px 25px rgba(15, 118, 110, 0.3)")}
            >
              {loading && (
                <span className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </span>
              )}
              <span className={loading ? "opacity-0" : ""}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</span>
            </button>

            {/* Sign Up Link */}
            <p className={`text-center text-sm mt-6 ${darkMode ? "text-slate-400" : "text-gray-600"}`}>
              Chưa có tài khoản?{" "}
              <Link
                href="/register"
                className="font-semibold transition-colors"
                style={{ color: "#14B8A6" }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#0F766E")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#14B8A6")}
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`p-4 text-center text-sm ${darkMode ? "text-slate-500" : "text-gray-500"}`}>
        © 2026 SecureAuth Todo. All rights reserved.
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-3px) scale(1.1);
          }
        }
        
        @keyframes shake-subtle {
          0%, 100% {
            transform: translateX(0) scale(1);
          }
          25% {
            transform: translateX(-2px) scale(1.05);
          }
          75% {
            transform: translateX(2px) scale(1.05);
          }
        }
        
        @keyframes blink {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.9);
          }
        }
        
        @keyframes check-pop {
          0% {
            transform: scale(0) rotate(-45deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(0deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
        
        .animate-check-pop {
          animation: check-pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
      `}</style>
    </div>
  )
}
