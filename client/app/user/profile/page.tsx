'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserService } from '@/services/user/user.service'
import type { UserData } from '@/types/user/user.type'
import { User, Shield, Bell, Pencil, ExternalLink, Loader2, Check, Smartphone, Plus, Upload, Menu, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploader } from "@/components/ui/avatar-uploader"
import { useRouter } from 'next/navigation'
import { redirect } from 'next/navigation'
import { AuthService } from '@/services/auth/auth.service'
import { Enable2FAResponse } from '@/types/user/2fa.type'
import { getCookie, removeCookie } from '@/lib/cookies'
import { authStorage } from '@/services/auth/auth-storage.service'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

const userService = new UserService()
const authService = new AuthService()

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState<string>('')
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false)
  const router = useRouter()

  // Theme state
  const [darkMode, setDarkMode] = useState(true)

  // Form states
  const [name, setName] = useState('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // 2FA states
  const [enabling2FA, setEnabling2FA] = useState(false)
  const [enable2FAData, setEnable2FAData] = useState<Enable2FAResponse | null>(null)

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const token = authStorage.getAccessToken()
        const refreshToken = authStorage.getRefreshToken()
        
        if (!token || !refreshToken) {
          setError('Vui lòng đăng nhập')
          router.push('/login')
          return
        }

        const data = await userService.getUser(token, refreshToken)
        if (data) {
          setUserData(data)
          setName(data.user?.name || '')
        }
      } catch (err) {
        console.error('Error fetching user:', err)
        setError('Đã xảy ra lỗi khi tải thông tin người dùng')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const token = authStorage.getAccessToken()
      if (!token) {
        alert('Vui lòng đăng nhập lại')
        router.push('/login')
        return
      }

      const updatedUser = await userService.updateUser(token, { name })
      if (updatedUser) {
        setSaveMessage('Cập nhật thông tin thành công')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setSaveMessage('Có lỗi xảy ra khi cập nhật thông tin')
    } finally {
      setSaving(false)
    }
  }

  const handleEnable2FA = async () => {
    setEnabling2FA(true)
    try {
      const token = authStorage.getAccessToken()
      const accessVerificationToken = authStorage.getVerificationToken()
      
      if (token && accessVerificationToken) {
        const res = await userService.enableTwoFactor(token, accessVerificationToken)
        if (res) {
          alert("Đã yêu cầu bật 2FA (Cần implement flow QR code)")
          setEnable2FAData(res)
        } else {
          alert("Bật 2FA thất bại")
        }
      } else {
        alert('Vui lòng đăng nhập lại')
        router.push('/login')
      }
    } catch (e) {
      console.error(e)
      alert('Có lỗi xảy ra khi bật 2FA')
    } finally {
      setEnabling2FA(false)
    }
  }

  const handleDisable2FA = async () => {
    if (window.confirm('Bạn có chắc chắn muốn tắt xác thực 2 yếu tố?')) {
      try {
        const token = authStorage.getAccessToken()
        const accessVerificationToken = authStorage.getVerificationToken()
        if (!token || !accessVerificationToken) {
          alert('Vui lòng đăng nhập lại')
          router.push('/login')
          return
        }

        const success = await userService.disableTwoFactor(token, accessVerificationToken)
        if (success) {
          alert('Đã tắt xác thực 2 yếu tố thành công')
        } else {
          alert('Tắt xác thực 2 yếu tố thất bại')
        }
      } catch (error) {
        console.error('Error disabling 2FA:', error)
        alert('Có lỗi xảy ra khi tắt xác thực 2 yếu tố')
      }
    }
  }

  const handleAvatarUpload = async (file: File) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
      return { success: true };
    } catch (error) {
      console.error("Avatar upload failed:", error);
      return { success: false };
    }
  }

  const toggleTheme = () => {
    setDarkMode(!darkMode)
  }

  const handleLogout = async () => {
    const token = getCookie('access_token');
    const refresh_token = getCookie('refresh_token');
    if (token && refresh_token) {
      const response = await authService.logout(token, refresh_token);
      if(response) {
        removeCookie('access_token');
        removeCookie('refresh_token');
        removeCookie('access_verification_token');
        alert(response.message);
        router.push('/');
      } else {
        alert("Đăng xuất thất bại");
      }
    } else {
      alert('Vui lòng đăng nhập lại');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center flex-col gap-5 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="bg-white dark:bg-slate-900 p-6 rounded shadow border border-red-200 text-red-600">
          {error}
        </div>
        <button onClick={() => router.push('/login')} className="bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700 text-white font-medium px-8 py-3 rounded-lg transition-all shadow-lg shadow-red-700/20 hover:shadow-red-700/40 flex items-center gap-2 justify-center active:scale-[0.98]">Đăng nhập</button>
      </div>
    )
  }

  const handleVerify2FACode = async () => {
    if (twoFactorCode.length !== 6) return
    
    setIsSubmitting2FA(true)
    try {
      const token = authStorage.getAccessToken()
      if (!token || !enable2FAData?.data.secret) {
        router.push('/login')
        return
      }
      
      const response = await userService.verifyTwoFactor(
        token,
        enable2FAData.data.secret,
        twoFactorCode
      )
      
      // if (response) {
      //   // Handle successful verification
      //   setUserData(prev => prev ? {
      //     ...prev,
      //     user: {
      //       ...prev.user,
      //       two_factor_enabled: true
      //     }
      //   } : null)
      //   setEnable2FAData(null)
      //   setTwoFactorCode('')
      //   // Show success message
      // } else {
      //   // Show error message
      // }
    } catch (error) {
      console.error('2FA verification failed:', error)
      // Show error message
    } finally {
      setIsSubmitting2FA(false)
    }
  }

  if (!userData) return null

  const SidebarContent = () => (
    <nav className="space-y-1">
      <Link href="/user/profile" className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-400 font-medium rounded-lg">
        <User className="w-4 h-4" />
        Tài khoản của tôi
      </Link>
      <Link href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
        <Shield className="w-4 h-4" />
        Truy cập
      </Link>
      <Link href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
        <Bell className="w-4 h-4" />
        Thông báo
      </Link>
    </nav>
  )

  return (
    // Wrapper to apply 'dark' class based on state. 
    // In a real app with next-themes, this would be handled globally.
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col md:flex-row transition-colors duration-300">

        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors duration-300">
          <div className="font-semibold text-lg text-teal-700 dark:text-teal-500 ml-2">GenHub</div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Drawer direction="left">
              <DrawerTrigger asChild>
                <button className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Menu className="w-6 h-6" />
                </button>
              </DrawerTrigger>
              <DrawerContent className="h-full w-[80%] max-w-sm rounded-r-2xl outline-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DrawerHeader className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                  <DrawerTitle className="text-xl font-bold text-teal-700 dark:text-teal-500 text-left px-2">GenHub</DrawerTitle>
                  <DrawerDescription className="sr-only">Menu nav</DrawerDescription>
                </DrawerHeader>
                <div className="px-4">
                  <SidebarContent />
                </div>
                <DrawerFooter className="mt-auto border-t border-slate-200 dark:border-slate-800">
                  <DrawerClose asChild>
                    <button className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 rounded-lg font-medium transition-colors">Đóng</button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:block w-64 flex-shrink-0 p-8 pt-12 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen overflow-y-auto z-20 transition-colors duration-300">
          <div className="mb-10 px-4 font-bold text-2xl text-teal-700 dark:text-teal-500 flex items-center justify-between">
            <span>GenHub</span>
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <SidebarContent />
          <button onClick={handleLogout} className="btn-logout mt-10">
            Đăng xuất
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 pt-6 md:pt-12 max-w-5xl mx-auto w-full">
          <h1 className="text-2xl md:text-3xl text-slate-800 dark:text-white mb-6 md:mb-8 font-bold flex items-center gap-3">
            <User className="w-8 h-8 text-teal-600 dark:text-teal-500 md:hidden" />
            Tài khoản của tôi
          </h1>

          <div className="space-y-6 pb-20 md:pb-0">
            {/* Account Settings Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-800 p-5 md:p-8 transition-colors duration-300">
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

                {/* Left Column: Form */}
                <div className="flex-1 space-y-8 order-2 lg:order-1">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      Thông tin cá nhân
                    </h2>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* Email & Password Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Địa chỉ email</label>
                        <div className="relative group">
                          <input
                            type="email"
                            value={userData.user.email}
                            disabled
                            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none cursor-not-allowed text-ellipsis font-mono text-sm"
                          />
                          <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 opacity-50" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Mật khẩu</label>
                        <div className="relative">
                          <input
                            type="password"
                            value="............."
                            disabled
                            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none cursor-not-allowed font-mono text-sm tracking-widest"
                          />
                          <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Name Row */}
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Họ và tên</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          placeholder="Nhập họ và tên của bạn"
                        />
                      </div>
                    </div>

                    {/* Language Row (Mock) */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Ngôn ngữ</label>
                      <div className="relative">
                        <select className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer shadow-sm">
                          <option>English</option>
                          <option>Tiếng Việt</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-6 flex items-center gap-4 border-t border-slate-200 dark:border-slate-700 mt-8">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white font-medium px-8 py-3 rounded-lg transition-all shadow-lg shadow-teal-700/20 hover:shadow-teal-700/40 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 w-full md:w-auto justify-center active:scale-[0.98]"
                      >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                      {saveMessage && <span className="text-emerald-500 dark:text-emerald-400 font-medium text-sm animate-in fade-in slide-in-from-left-2">{saveMessage}</span>}
                      <button
                        onClick={handleLogout}
                        className="bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700 text-white font-medium px-8 py-3 rounded-lg transition-all shadow-lg shadow-red-700/20 hover:shadow-red-700/40 flex items-center gap-2 w-full md:w-auto justify-center active:scale-[0.98]"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Column: Avatar */}
                <div className="w-full lg:w-80 flex-shrink-0 flex flex-col order-1 lg:order-2">
                  <div className="space-y-2 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4 hidden lg:block">Ảnh đại diện</h3>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 flex-1 w-full justify-center min-h-[300px] relative overflow-hidden shadow-sm transition-colors duration-300">
                      {/* Background decorative blob */}
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-50 dark:bg-teal-900/20 rounded-full blur-2xl opacity-60" />
                      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-slate-100 dark:bg-slate-800/50 rounded-full blur-2xl opacity-60" />

                      {/* Shadcn Avatar with Verification Badge */}
                      <div className="relative mb-6 z-10 group cursor-pointer transition-transform hover:scale-105 duration-300">
                        <Avatar className="h-32 w-32 border-[6px] border-white dark:border-slate-800 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 object-cover bg-white dark:bg-slate-700">
                          <AvatarImage className="object-cover" src={avatarPreview || `https://www.gravatar.com/avatar/${userData.user.email ? userData.user.email : 'default'}?d=mp`} alt={userData.user.name} />
                          <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 text-teal-600 dark:text-teal-400">
                            {userData.user.name ? userData.user.name.charAt(0).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>

                        {true && (
                          <div className="absolute bottom-1 right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-md border border-slate-100 dark:border-slate-700" title="Verified Account">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="10" className="fill-teal-600 dark:fill-teal-500" />
                              <path
                                className="fill-white dark:fill-slate-900"
                                d="M9 16.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.6-5.6 1.4 1.4z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="z-10 mt-2 mb-6">
                        <p className="font-semibold text-lg text-slate-800 dark:text-white">{userData.user.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{userData.user.email}</p>
                      </div>

                      <AvatarUploader onUpload={handleAvatarUpload}>
                        <button
                          type="button"
                          className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow group z-10 active:scale-95"
                        >
                          <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
                          Tải ảnh mới
                        </button>
                      </AvatarUploader>

                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 max-w-[200px] leading-relaxed">
                        Định dạng: .jpg, .png. Kích thước tối đa 5MB.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Authenticator App Section (2FA) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-800 p-5 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative transition-colors duration-300">
              <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-slate-50 dark:from-slate-800/20 to-transparent pointer-events-none md:block hidden" />

              <div className="flex-1 relative z-10">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-600 dark:text-teal-500" />
                  Bảo mật 2 lớp (2FA)
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-2xl">
                  Bảo vệ tài khoản của bạn bằng cách yêu cầu mã xác minh từ ứng dụng (Google Authenticator, Authy) mỗi khi đăng nhập.
                </p>
                <div className="mt-5 flex items-center gap-3 text-sm">
                  {userData.user.two_factor_enabled ? (
                    <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full w-fit shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                      Đã kích hoạt
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                      <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                      Chưa kích hoạt
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full md:w-auto relative z-10">
                {!userData.user.two_factor_enabled && (
                  <button
                    onClick={handleEnable2FA}
                    disabled={enabling2FA}
                    className="w-full cursor-pointer md:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 font-bold px-5 py-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 group"
                  >
                    {enabling2FA ? <Loader2 className="w-4 h-4 animate-spin" /> :
                      <div className="bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-md group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                        <Smartphone className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </div>
                    }
                    Thiết lập 2FA
                  </button>
                )}
                {userData.user.two_factor_enabled && (
                  <button
                    onClick={handleDisable2FA}
                    className="w-full md:w-auto bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-800 font-semibold px-5 py-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Vô hiệu hóa
                  </button>
                )}
              </div>
            </div>

            {/* Hiển thị QR code và backup code */}
            {enable2FAData?.data && (
              <div className="mt-6 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Quét mã QR
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Quét mã QR bằng ứng dụng xác thực của bạn để thêm tài khoản
                  </p>
                  <div className="flex justify-center p-4 bg-white rounded-lg border border-gray-200 dark:bg-slate-700 dark:border-slate-600">
                    <img 
                      src={enable2FAData.data.qr_code_url} 
                      alt="2FA QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                    Hoặc nhập mã thủ công: <span className="font-mono font-bold text-gray-900 dark:text-white">{enable2FAData.data.secret}</span>
                  </p>
                </div>
              </div>
            )}
            {enable2FAData && (
              <div className="mt-6 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                    Xác nhận mã 2FA
                  </h3>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Nhập mã xác thực 6 số từ ứng dụng xác thực của bạn
                    </p>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-1 max-w-[240px]">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Mã xác thực"
                          maxLength={6}
                          value={twoFactorCode}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            setTwoFactorCode(value)
                          }}
                          className="text-center text-lg font-mono tracking-widest h-12"
                        />
                      </div>
                      
                      <Button
                        onClick={handleVerify2FACode}
                        disabled={twoFactorCode.length !== 6 || isSubmitting2FA}
                        className="h-12 px-6"
                      >
                        {isSubmitting2FA ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang xác thực...
                          </div>
                        ) : 'Xác nhận'}
                      </Button>
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Mã xác thực sẽ hết hạn sau 30 giây
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
