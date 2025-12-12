'use client'

import { useEffect, useState } from 'react'
import { UserService } from '@/services/user/user.service'
import type { UserData } from '@/types/user/user.type'
import { User, Shield, Bell, Pencil, ExternalLink, Loader2, Check, Smartphone, Plus, Upload } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploader } from "@/components/ui/avatar-uploader"

const userService = new UserService()

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // 2FA states
  const [enabling2FA, setEnabling2FA] = useState(false)

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        setError(null)
        const token = localStorage.getItem('access_token')
        if (!token) {
          setError('Bạn chưa đăng nhập')
          return
        }
        const data = await userService.getUser(token)
        if (!data) {
          setError('Không lấy được thông tin người dùng')
        } else {
          setUserData(data)
          setName(data.user.name)
        }
      } catch (err) {
        setError('Đã xảy ra lỗi khi tải thông tin người dùng')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    // Placeholder for update logic
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSaveMessage('Đã lưu thay đổi (Mô phỏng)')
    }, 1000)
  }

  const handleEnable2FA = async () => {
    // Mock flow or actual call - keeping it simple for UI demo as requested
    // In real implementation, this would likely open a modal with QR code
    setEnabling2FA(true)
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        const res = await userService.enableTwoFactor(token)
        if (res && res.success) {
          // Refresh user data or update local state
          alert("Đã yêu cầu bật 2FA (Cần implement flow QR code)")
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setEnabling2FA(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real application, you would upload the file to your server here
      // const formData = new FormData();
      // formData.append('avatar', file);
      // await userService.updateAvatar(formData);

      // For demo purposes, we'll just show the local preview
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);

      return { success: true };
    } catch (error) {
      console.error("Avatar upload failed:", error);
      return { success: false };
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F766E]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="bg-white p-6 rounded shadow border border-red-200 text-red-600">
          {error}
        </div>
      </div>
    )
  }

  if (!userData) return null

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#1E293B] flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 p-8 pt-12">
        <nav className="space-y-1">
          <Link href="/user/profile" className="flex items-center gap-3 px-4 py-2 bg-[#F1F5F9] text-[#0F766E] font-medium rounded-lg">
            <User className="w-4 h-4" />
            Tài khoản của tôi
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-2 text-[#64748B] hover:text-[#1E293B] hover:bg-gray-100 rounded-lg transition-colors">
            <Shield className="w-4 h-4" />
            Truy cập
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-2 text-[#64748B] hover:text-[#1E293B] hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
            Thông báo
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 pt-12 max-w-5xl">
        <h1 className=" text-3xl text-[#1E293B] mb-8">Tài khoản của tôi</h1>

        <div className="space-y-6">
          {/* Account Settings Card */}
          <div className="bg-[#FFFFFF] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.04)] border border-[#E2E8F0] p-8">
            <div className="flex flex-col lg:flex-row gap-12">

              {/* Left Column: Form */}
              <div className="flex-1 space-y-8">
                <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-6">
                  <h2 className="text-xl font-semibold">Cài đặt tài khoản</h2>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {/* Email & Password Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#64748B]">Địa chỉ email</label>
                      <div className="relative group">
                        <input
                          type="email"
                          value={userData.user.email}
                          disabled
                          className="w-full bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] rounded-lg px-4 py-2.5 focus:outline-none cursor-not-allowed"
                        />
                        <Pencil className="w-4 h-4 text-[#94A3B8] absolute right-3 top-3 opacity-50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#64748B]">Mật khẩu</label>
                      <div className="relative">
                        <input
                          type="password"
                          value="............."
                          disabled
                          className="w-full bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] rounded-lg px-4 py-2.5 focus:outline-none cursor-not-allowed"
                        />
                        <Pencil className="w-4 h-4 text-[#94A3B8] absolute right-3 top-3" />
                      </div>
                    </div>
                  </div>

                  {/* Name Row */}
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#64748B]">Họ và tên</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white text-[#1E293B] border border-[#E2E8F0] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Language Row (Mock) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#64748B]">Ngôn ngữ</label>
                    <select className="w-full bg-white text-[#1E293B] border border-[#E2E8F0] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent outline-none transition-all appearance-none cursor-pointer">
                      <option>English</option>
                      <option>Tiếng Việt</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-[#0F766E] hover:bg-[#0D5A52] text-white font-medium px-6 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Lưu thay đổi
                    </button>
                    {saveMessage && <span className="text-[#10B981] text-sm">{saveMessage}</span>}
                  </div>
                </form>
              </div>

              {/* Right Column: Avatar */}
              <div className="w-full lg:w-72 flex-shrink-0 flex flex-col">
                <div className="space-y-2 flex-1 flex flex-col">
                  <h3 className="text-sm font-medium text-[#64748B] mb-6">Ảnh đại diện</h3>
                  <div className="border border-[#E2E8F0] rounded-xl p-6 flex flex-col items-center text-center bg-white flex-1 w-full justify-center min-h-[250px]">

                    {/* Shadcn Avatar with Verification Badge */}
                    <div className="relative mb-4">
                      <Avatar className="h-24 w-24 border-4 border-white shadow-sm ring-2 ring-[#E2E8F0]">
                        <AvatarImage src={avatarPreview || `https://www.gravatar.com/avatar/${userData.user.email ? userData.user.email : 'default'}?d=mp`} alt={userData.user.name} />
                        <AvatarFallback className="text-2xl font-semibold bg-[#E0F2FE] text-[#0EA5E9]">
                          {userData.user.name ? userData.user.name.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>

                      {true && (
                        <span className="absolute -right-0 -top-1">
                          <span className="sr-only">Verified</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              className="fill-white"
                              d="M3.046 8.277A4.402 4.402 0 0 1 8.303 3.03a4.4 4.4 0 0 1 7.411 0 4.397 4.397 0 0 1 5.19 3.068c.207.713.23 1.466.067 2.19a4.4 4.4 0 0 1 0 7.415 4.403 4.403 0 0 1-3.06 5.187 4.398 4.398 0 0 1-2.186.072 4.398 4.398 0 0 1-7.422 0 4.398 4.398 0 0 1-5.257-5.248 4.4 4.4 0 0 1 0-7.437Z"
                            />
                            <path
                              className="fill-[#0F766E]"
                              d="M4.674 8.954a3.602 3.602 0 0 1 4.301-4.293 3.6 3.6 0 0 1 6.064 0 3.598 3.598 0 0 1 4.3 4.302 3.6 3.6 0 0 1 0 6.067 3.6 3.6 0 0 1-4.29 4.302 3.6 3.6 0 0 1-6.074 0 3.598 3.598 0 0 1-4.3-4.293 3.6 3.6 0 0 1 0-6.085Z"
                            />
                            <path
                              className="fill-white"
                              d="M15.707 9.293a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 1 1 1.414-1.414L11 12.586l3.293-3.293a1 1 0 0 1 1.414 0Z"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                    <AvatarUploader onUpload={handleAvatarUpload}>
                      <button
                        type="button"
                        className="mt-6 flex items-center gap-2 px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] text-[#1E293B] rounded-lg text-sm font-medium transition-all shadow-sm group"
                      >
                        <Upload className="w-4 h-4 text-[#64748B] group-hover:text-[#0F766E] transition-colors" />
                        Tải ảnh lên
                      </button>
                    </AvatarUploader>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Authenticator App Section (2FA) */}
          <div className="bg-[#FFFFFF] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.04)] border border-[#E2E8F0] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-[#1E293B] mb-2 flex items-center gap-2">
                Ứng dụng xác thực (2FA)
              </h3>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-2xl">
                Sử dụng ứng dụng xác thực (ví dụ: Google Authenticator) trên điện thoại của bạn để tạo mã xác minh khi đăng nhập. Giúp bảo vệ tài khoản của bạn an toàn hơn.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm">
                {userData.user.two_factor_enabled ? (
                  <span className="flex items-center gap-2 text-[#10B981] font-medium bg-[#ECFDF5] px-3 py-1 rounded-full w-fit">
                    <Check className="w-4 h-4" />
                    Đã bật
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-[#64748B]">
                    <span className="w-2 h-2 rounded-full bg-[#64748B]" />
                    Chưa bật • Mã sẽ được gửi qua email
                  </span>
                )}
              </div>
            </div>

            <div>
              {!userData.user.two_factor_enabled && (
                <button
                  onClick={handleEnable2FA}
                  disabled={enabling2FA}
                  className="bg-white border border-[#E2E8F0] text-[#1E293B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] font-medium px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2"
                >
                  {enabling2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4 text-[#64748B]" />}
                  Kích hoạt
                </button>
              )}
              {userData.user.two_factor_enabled && (
                <button
                  className="bg-white border border-[#E2E8F0] text-[#EF4444] hover:bg-[#FEF2F2] hover:border-[#FECACA] font-medium px-4 py-2 rounded-lg transition-all shadow-sm"
                >
                  Tắt 2FA
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
