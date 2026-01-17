'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserService } from '@/services/user/user.service'
import type { UserData } from '@/types/user/user.type'
import { User, Shield, Lock, Bell, Loader2, Check, Smartphone, Upload, Menu, Sun, Moon, AlertTriangle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploader } from "@/components/ui/avatar-uploader"
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth/auth.service'
import { Enable2FAResponse } from '@/types/user/2fa.type'
import { authStorage } from '@/services/auth/auth-storage.service'
import { useToast } from "@/contexts/ToastContext"
import Link from 'next/link'
import Image from 'next/image'
import { NotificationService } from "@/services/notification/notification.service";
import type { Notification } from "@/types/notification/notification.type";

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

// Type definitions
interface SecurityTabProps {
  userData: UserData | null;
  enabling2FA: boolean;
  handleEnable2FA: () => Promise<void>;
  handleDisable2FA: () => Promise<void>;
}

const userService = new UserService()
const authService = new AuthService()
const notificationService = new NotificationService();

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState<string>('')
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const router = useRouter()
  const { showToast } = useToast()

  // Theme state
  const [darkMode, setDarkMode] = useState(true)

  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Form states
  const [name, setName] = useState('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // 2FA states
  const [enabling2FA, setEnabling2FA] = useState(false)
  const [enable2FAData, setEnable2FAData] = useState<Enable2FAResponse | null>(null)

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Add these states at the top of your component
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

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

        const getUserNotifications = await notificationService.getNotifications(token);
        const getGlobalNotifications = await notificationService.globalNotification(token);
        setNotifications([...getGlobalNotifications, ...getUserNotifications]);

        // if (data && !data.success) {
        //   alert(data.message)
        // } else {
        //   setUserData(data)
        //   setName(data.user?.name || '')
        // }
      } catch (err) {
        console.error('Error fetching user:', err)
        setError('Đã xảy ra lỗi khi tải thông tin người dùng')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const token = authStorage.getAccessToken()
      if (!token) {
        showToast('Vui lòng đăng nhập lại', 'error')
        router.push('/login')
        return
      }

      const updatedUser = await userService.updateUser(token, { name })
      if (updatedUser) {
        setSaveMessage('Cập nhật thông tin thành công')
        showToast('Cập nhật thông tin thành công', 'success')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setSaveMessage('Có lỗi xảy ra khi cập nhật thông tin')
      showToast('Có lỗi xảy ra khi cập nhật thông tin', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Add this handler function
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setChangePasswordData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user types
    setPasswordErrors(prev => ({
      ...prev,
      [name]: ''
    }))
  }
  const validatePasswordChange = () => {
    let isValid = true
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    if (!changePasswordData.currentPassword) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại'
      isValid = false
    }
    if (!changePasswordData.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới'
      isValid = false
    } else if (changePasswordData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự'
      isValid = false
    }
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp'
      isValid = false
    }
    setPasswordErrors(newErrors)
    return isValid
  }

  const handleSubmitPasswordChange = async () => {
    if (!validatePasswordChange()) return
    try {
      setLoading(true)
      const token = authStorage.getAccessToken()
      if (!token) {
        showToast('Vui lòng đăng nhập lại', 'error')
        router.push('/login')
        return
      }
      const response = await userService.change_password(
        token,
        {
          current_password: changePasswordData.currentPassword,
          new_password: changePasswordData.newPassword,
          confirm_password: changePasswordData.confirmPassword,
          logout_all_devices: true
        }
      )
      if (response.success) {
        showToast('Đổi mật khẩu thành công', 'success')
        setShowChangePassword(false)
        setChangePasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        showToast(response.message || 'Đổi mật khẩu thất bại', 'error')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      showToast('Có lỗi xảy ra khi đổi mật khẩu', 'error')
    } finally {
      setLoading(false)
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
          showToast("Đã yêu cầu bật 2FA (Cần implement flow QR code)", 'info')
          setEnable2FAData(res)
        } else {
          showToast("Bật 2FA thất bại", 'error')
        }
      } else {
        showToast('Vui lòng đăng nhập lại', 'error')
        router.push('/login')
      }
    } catch (e) {
      console.error(e)
      showToast('Có lỗi xảy ra khi bật 2FA', 'error')
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
          showToast('Vui lòng đăng nhập lại', 'error')
          router.push('/login')
          return
        }

        const response = await userService.disableTwoFactor(token, accessVerificationToken)
        if (response.success) {
          authStorage.clearTokens()
          handleLogout()
          showToast('Đã tắt xác thực 2 yếu tố thành công', 'success')
          showToast('Vui lòng đăng nhập lại', 'info')
          router.push('/login')
        } else {
          showToast('Tắt xác thực 2 yếu tố thất bại', 'error')
        }
      } catch (error) {
        console.error('Error disabling 2FA:', error)
        showToast('Có lỗi xảy ra khi tắt xác thực 2 yếu tố', 'error')
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
    const token = authStorage.getAccessToken();
    const refresh_token = authStorage.getRefreshToken();
    if (token && refresh_token) {
      const response = await authService.logout(token, refresh_token);
      if (response) {
        authStorage.clearTokens()
        showToast(response.message, 'success');
        router.push('/');
      } else {
        showToast("Đăng xuất thất bại", 'error');
      }
    } else {
      showToast('Vui lòng đăng nhập lại', 'error');
      router.push('/login');
    }
  };

  const SecurityTab = ({ userData, enabling2FA, handleEnable2FA, handleDisable2FA }: SecurityTabProps) => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-800 p-5 md:p-8">
        <h2 className="text-xl font-semibold mb-6">Bảo mật</h2>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <h3 className="font-medium">Xác thực 2 yếu tố (2FA)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {userData?.user?.two_factor_enabled
                  ? 'Đã bật xác thực 2 yếu tố'
                  : 'Thêm một lớp bảo mật bổ sung cho tài khoản của bạn'}
              </p>
            </div>
            {userData?.user?.two_factor_enabled ? (
              <Button
                variant="outline"
                onClick={handleDisable2FA}
                className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Tắt 2FA
              </Button>
            ) : (
              <Button
                onClick={handleEnable2FA}
                disabled={enabling2FA}
                className="bg-brand hover:bg-brand/90"
              >
                {enabling2FA ? 'Đang bật...' : 'Bật xác thực 2 yếu tố'}
              </Button>
            )}
          </div>
        </div>
      </div>
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
              <Image
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
                <div className="flex-1 max-w-60">
                  <Input
                    type="text"
                    placeholder="Mã xác thực"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setTwoFactorCode(value);
                    }}
                    className="text-center text-lg font-mono tracking-widest h-12"
                    autoFocus
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
  );

  const NotificationsTab = ({ notifications }: { notifications: Notification[] }) => {
    const [selectedType, setSelectedType] = useState<string>('all')

    const notificationTypes = [
      { value: 'all', label: 'Tất cả' },
      { value: 'INFO', label: 'Thông tin' },
      { value: 'SUCCESS', label: 'Thành công' },
      { value: 'WARNING', label: 'Cảnh báo' },
      { value: 'ERROR', label: 'Lỗi' }
    ]

    const filteredNotifications = selectedType === 'all' 
      ? notifications 
      : notifications.filter(n => n.type === selectedType)

    const getTypeColor = (type: string) => {
      switch (type) {
        case 'SUCCESS':
          return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        case 'ERROR':
          return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        case 'WARNING':
          return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        case 'INFO':
        default:
          return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      }
    }

    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'SUCCESS':
          return <Check className="w-4 h-4 text-green-600" />
        case 'ERROR':
          return <AlertTriangle className="w-4 h-4 text-red-600" />
        case 'WARNING':
          return <AlertTriangle className="w-4 h-4 text-yellow-600" />
        case 'INFO':
        default:
          return <Bell className="w-4 h-4 text-blue-600" />
      }
    }

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-800 p-5 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Thông báo</h2>
            <Button variant="outline" size="sm">
              Đánh dấu tất cả đã đọc
            </Button>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {notificationTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedType === type.value
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    getTypeColor(notification.type)
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">{notification.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{notification.content}</p>
                      {notification.created_at && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          {new Date(notification.created_at).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">Không có thông báo nào</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
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
      const access_verification_token = authStorage.getVerificationToken()
      if (!token || !access_verification_token) {
        router.push('/login')
        return
      }

      const response = await userService.verifySetUp(token, access_verification_token, twoFactorCode)

      if (response.success) {
        setEnable2FAData(null)
        setTwoFactorCode('')
        showToast(response.message, 'success')
        authStorage.clearTokens()
        handleLogout()
        showToast('Đăng nhập lại để hoàn tất quá trình xác nhận 2FA', 'info')
        router.push('/login')
      } else {
        showToast(response.message, 'error')
      }
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
      <button
        onClick={() => setActiveTab('profile')}
        className={`w-full flex items-center gap-3 px-4 py-2 ${activeTab === 'profile' ? 'bg-bg-subtle text-brand font-medium' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'} rounded-lg transition-colors`}
      >
        <User className="w-4 h-4" />
        Tài khoản của tôi
      </button>
      <button
        onClick={() => setActiveTab('security')}
        className={`w-full flex items-center gap-3 px-4 py-2 ${activeTab === 'security' ? 'bg-bg-subtle text-brand font-medium' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'} rounded-lg transition-colors text-left`}
      >
        <Shield className="w-4 h-4" />
        Bảo mật
      </button>
      <button
        onClick={() => setActiveTab('notifications')}
        className={`w-full flex items-center gap-3 px-4 py-2 ${activeTab === 'notifications' ? 'bg-bg-subtle text-brand font-medium' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'} rounded-lg transition-colors`}
      >
        <Bell className="w-4 h-4" />
        Thông báo
        {notifications.some(n => !n.is_read) && (
          <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>
    </nav>
  )

  return (
    // Wrapper to apply 'dark' class based on state. 
    // In a real app with next-themes, this would be handled globally.
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col md:flex-row transition-colors duration-300">

        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors duration-300">
          <Link href="/" className="ml-2">
            <Image
              src="/assets/Genhubv2.svg"
              alt="GenHub Logo"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.some(n => !n.is_read) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                    <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Thông báo</h3>
                        <button className="text-sm text-brand hover:underline">Đánh dấu đã đọc tất cả</button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto notification-dropdown">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            onClick={() => setShowNotifications(false)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 shrink-0">
                                <div className="w-2 h-2 rounded-full bg-brand"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{notification.title}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{notification.content}</p>
                                {notification.created_at && (
                                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(notification.created_at).toLocaleString('vi-VN')}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                          Không có thông báo mới
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-slate-200 dark:border-slate-700 text-center">
                      <button className="text-sm text-brand hover:underline">Xem tất cả thông báo</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
            <Drawer direction="left">
              <DrawerTrigger asChild>
                <button className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Menu className="w-6 h-6" />
                </button>
              </DrawerTrigger>
              <DrawerContent className="h-full w-[80%] max-w-sm rounded-r-2xl outline-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DrawerHeader className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                  <DrawerTitle className="text-xl font-bold text-brand text-left px-2">
                    <Image
                      src="/assets/Genhubv2.svg"
                      alt="GenHub Logo"
                      width={120}
                      height={40}
                      className="h-8 w-auto"
                    />
                  </DrawerTitle>
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
        <aside className="hidden md:block w-64 shrink-0 p-8 pt-12 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen overflow-y-auto z-20 transition-colors duration-300">
          <div className="mb-10 px-4 font-bold text-2xl text-brand flex items-center justify-between">
            <Image
              src="/assets/Genhubv2.svg"
              alt="GenHub Logo"
              width={140}
              height={50}
              className="h-10 w-auto"
            />
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-brand transition-colors rounded-full hover:bg-bg-subtle"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 pt-6 md:pt-12 max-w-5xl mx-auto w-full">
          {activeTab === 'profile' &&
            <div>
              <h1 className="text-2xl md:text-3xl text-slate-800 dark:text-white mb-6 md:mb-8 font-bold flex items-center gap-3">
                <User className="w-8 h-8 text-brand md:hidden" />
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
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Địa chỉ email</label>
                            <div className="relative group">
                              <input
                                type="email"
                                value={userData.user.email}
                                disabled
                                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none cursor-not-allowed text-ellipsis font-mono text-sm"
                              />
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
                              className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                              placeholder="Nhập họ và tên của bạn"
                            />
                          </div>
                        </div>

                        {/* Language Row (Mock) */}
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Ngôn ngữ</label>
                          <div className="relative">
                            <select className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all appearance-none cursor-pointer shadow-sm">
                              <option>English</option>
                              <option>Tiếng Việt</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 border-t pt-8">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">Đổi mật khẩu</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                Cập nhật mật khẩu tài khoản của bạn
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowChangePassword(!showChangePassword)}
                              className="text-sm cursor-pointer font-medium text-teal-600 hover:text-teal-500"
                            >
                              {showChangePassword ? 'Hủy' : 'Đổi mật khẩu'}
                            </button>
                          </div>

                          {showChangePassword && (
                            <div className="mt-6 space-y-5">
                              <div className="group">
                                <label className={`block text-sm font-medium mb-2 transition-colors ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className={`h-5 w-5 transition-all duration-300 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                                  </div>
                                  <input
                                    type="password"
                                    name="currentPassword"
                                    value={changePasswordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitPasswordChange()}
                                    placeholder="Nhập mật khẩu hiện tại"
                                    className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${darkMode
                                      ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20'
                                      : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20'}`}
                                  />
                                </div>
                                {passwordErrors.currentPassword && (
                                  <p className="mt-1 text-sm text-red-500">{passwordErrors.currentPassword}</p>
                                )}
                              </div>

                              <div className="group">
                                <label className={`block text-sm font-medium mb-2 transition-colors ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                  Mật khẩu mới <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className={`h-5 w-5 transition-all duration-300 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                                  </div>
                                  <input
                                    type="password"
                                    name="newPassword"
                                    value={changePasswordData.newPassword}
                                    onChange={handlePasswordChange}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitPasswordChange()}
                                    placeholder="Nhập mật khẩu mới"
                                    className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${darkMode
                                      ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20'
                                      : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20'}`}
                                  />
                                </div>
                                {passwordErrors.newPassword && (
                                  <p className="mt-1 text-sm text-red-500">{passwordErrors.newPassword}</p>
                                )}
                              </div>

                              <div className="group">
                                <label className={`block text-sm font-medium mb-2 transition-colors ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className={`h-5 w-5 transition-all duration-300 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                                  </div>
                                  <input
                                    type="password"
                                    name="confirmPassword"
                                    value={changePasswordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitPasswordChange()}
                                    placeholder="Nhập lại mật khẩu mới"
                                    className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 ${darkMode
                                      ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/20'
                                      : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-600 focus:ring-teal-600/20'}`}
                                  />
                                </div>
                                {passwordErrors.confirmPassword && (
                                  <p className="mt-1 text-sm text-red-500">{passwordErrors.confirmPassword}</p>
                                )}
                              </div>

                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={handleSubmitPasswordChange}
                                  disabled={loading}
                                  className="w-full py-3 rounded-lg font-semibold transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-white relative overflow-hidden"
                                  style={{
                                    background: loading ? "#64748B" : "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
                                    boxShadow: "0 10px 25px rgba(15, 118, 110, 0.3)",
                                  }}
                                  onMouseOver={(e) => !loading && (e.currentTarget.style.boxShadow = "0 15px 35px rgba(15, 118, 110, 0.4)")}
                                  onMouseOut={(e) => !loading && (e.currentTarget.style.boxShadow = "0 10px 25px rgba(15, 118, 110, 0.3)")}
                                >
                                  {loading ? (
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
                                  ) : null}
                                  <span className={loading ? 'opacity-0' : ''}>{loading ? 'Đang xử lý...' : 'Lưu thay đổi'}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-6 flex items-center gap-4 border-t border-border mt-8">
                          <button
                            type="submit"
                            disabled={saving}
                            className="bg-brand hover:bg-brand-hover text-white font-medium px-8 py-3 rounded-lg transition-all shadow-lg shadow-brand/20 hover:shadow-brand/40 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 w-full md:w-auto justify-center active:scale-[0.98]"
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
                    <div className="w-full lg:w-80 shrink-0 flex flex-col order-1 lg:order-2">
                      <div className="space-y-2 flex-1 flex flex-col">
                        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4 hidden lg:block">Ảnh đại diện</h3>
                        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center bg-linear-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 flex-1 w-full justify-center min-h-75 relative overflow-hidden shadow-sm transition-colors duration-300">
                          {/* Background decorative blob */}
                          <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-subtle rounded-full blur-2xl opacity-60" />
                          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-slate-100 dark:bg-slate-800/50 rounded-full blur-2xl opacity-60" />

                          {/* Shadcn Avatar with Verification Badge */}
                          <div className="relative mb-6 z-10 group cursor-pointer transition-transform hover:scale-105 duration-300">
                            <Avatar className="h-32 w-32 border-[6px] border-bg shadow-2xl ring-1 ring-black/5 dark:ring-white/10 object-cover bg-bg">
                              <AvatarImage className="object-cover" src={avatarPreview || `https://www.gravatar.com/avatar/${userData.user.email ? userData.user.email : 'default'}?d=mp`} alt={userData.user.name} />
                              <AvatarFallback className="text-4xl font-bold bg-linear-to-br from-brand-subtle to-brand/10 text-brand">
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
                                  <circle cx="12" cy="12" r="10" className="fill-brand" />
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
                              className="flex items-center gap-2 px-5 py-2.5 bg-bg border border-border hover:bg-bg-subtle hover:border-border-strong text-text rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow group z-10 active:scale-95"
                            >
                              <Upload className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                              Tải ảnh mới
                            </button>
                          </AvatarUploader>

                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 max-w-50 leading-relaxed">
                            Định dạng: .jpg, .png. Kích thước tối đa 5MB.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>}
          {activeTab === 'security' && (
            <SecurityTab
              userData={userData}
              enabling2FA={enabling2FA}
              handleEnable2FA={handleEnable2FA}
              handleDisable2FA={handleDisable2FA}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsTab notifications={notifications} />
          )}
        </main>
      </div>
    </div>
  )
}
