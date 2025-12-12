"use client"

import { useState, useEffect } from "react"
import { User, Lock, Eye, EyeOff, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { AuthService } from '@/services/auth/auth.service'
import { useRouter } from "next/navigation"

const authServices = new AuthService()

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      alert('Bạn đã đăng nhập!')
      router.push('/')
    }
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    try {
      // Call API login
      const response = await authServices.login(formData)
      console.log(response)
      if (response) {
        localStorage.setItem("access_token", response.authorization.access_token)
        localStorage.setItem("refresh_token", response.authorization.refresh_token)
        alert("Đăng nhập thành công!")
        router.push("/")
      } else {
        alert("Đăng nhập thất bại!")
      }
    } catch (error) {
      console.error("Login error:", error)
      alert("Có lỗi xảy ra!")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    // Implement Google OAuth
    window.location.href = "/api/auth/google"
  }

  const handleFacebookLogin = async () => {
    // Implement Facebook OAuth
    window.location.href = "/api/auth/facebook"
  }

  return (
    <div
      className={`h-full w-full overflow-hidden flex flex-col transition-colors duration-300 ${darkMode ? "bg-slate-900" : "bg-gray-100"}`}
    >
      <div className="w-full flex-1 flex flex-col animate-fade-in overflow-hidden">
        <div className="flex justify-end p-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            <div
              className="transition-transform duration-500 ease-in-out"
              style={{ transform: darkMode ? "rotate(0deg)" : "rotate(180deg)" }}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </div>
          </button>
        </div>

        <div
          className={`flex-1 flex flex-col items-center justify-center overflow-hidden transition-all ${darkMode ? "bg-slate-900" : "bg-gray-100"}`}
        >
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
              <label
                className={`block text-sm font-medium mb-2 transition-colors ${darkMode ? "text-slate-300" : "text-gray-700"}`}
              >
                Email hoặc Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User
                    className={`h-5 w-5 transition-all duration-300 ${
                      emailFocused ? "text-teal-500 scale-110" : darkMode ? "text-slate-500" : "text-gray-400"
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
                  className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${
                    darkMode
                      ? "bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20"
                      : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20"
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="group">
              <label
                className={`block text-sm font-medium mb-2 transition-colors ${darkMode ? "text-slate-300" : "text-gray-700"}`}
              >
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock
                    className={`h-5 w-5 transition-all duration-300 ${
                      passwordFocused ? "text-teal-500 scale-110" : darkMode ? "text-slate-500" : "text-gray-400"
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
                  className={`w-full pl-10 pr-12 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${
                    darkMode
                      ? "bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20"
                      : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-all duration-300 hover:scale-125 ${
                    darkMode ? "text-slate-500 hover:text-teal-500" : "text-gray-500 hover:text-teal-600"
                  }`}
                >
                  <div className="transition-all duration-300" style={{ animation: "blink 0.3s ease-in-out" }}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </div>
                </button>
              </div>
            </div>

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
                    className={`w-5 h-5 rounded border-2 transition-all duration-300 flex items-center justify-center ${
                      rememberMe
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

            <button
              onClick={handleLogin}
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

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${darkMode ? "border-slate-700" : "border-gray-300"}`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${darkMode ? "bg-slate-800/80 text-slate-400" : "bg-white/80 text-gray-600"}`}>
                  Hoặc tiếp tục với
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95 ${
                  darkMode
                    ? "bg-slate-700/50 border border-slate-600 hover:bg-slate-700 hover:border-slate-500"
                    : "bg-gray-50 border border-gray-300 hover:bg-white hover:border-gray-400"
                }`}
              >
                <svg className="w-5 h-5 transition-transform duration-300 hover:rotate-12" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-gray-700"}`}>Google</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleFacebookLogin}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95 ${
                  darkMode
                    ? "bg-slate-700/50 border border-slate-600 hover:bg-slate-700 hover:border-slate-500"
                    : "bg-gray-50 border border-gray-300 hover:bg-white hover:border-gray-400"
                }`}
              >
                <svg
                  className="w-5 h-5 transition-transform duration-300 hover:rotate-12"
                  fill="#1877F2"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-gray-700"}`}>Facebook</span>
              </button>
            </div>

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
      </div>

      {/* Footer */}
      <div className={`p-4 text-center text-sm ${darkMode ? "text-slate-500" : "text-gray-500"}`}>
        © 2025 SecureAuth Todo. All rights reserved.
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
