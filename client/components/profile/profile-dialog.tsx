'use client'

import { cn } from "@/lib/utils"

import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserService } from '@/services/user/user.service'
import type { UserData } from '@/types/user/user.type'
import { User, Shield, Lock, Bell, Loader2, Check, Smartphone, Upload, AlertTriangle, Building } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploader } from "@/components/ui/avatar-uploader"
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth/auth.service'
import { Enable2FAResponse } from '@/types/user/2fa.type'
import { authStorage } from '@/services/auth/auth-storage.service'
import { useToast } from "@/contexts/ToastContext"
import Image from 'next/image'
import { NotificationService } from "@/services/notification/notification.service";
import type { UserNotification, GlobalNotification } from "@/types/notification/notification.type";
type Notification = UserNotification | GlobalNotification;
import { organizationService } from "@/services/organization/organization.service";
import { CheckoutProvider } from '@/components/checkout/CheckoutWizard';
import { CompanyInfoStep } from '@/components/checkout/CompanyInfoStep';
import { RepresentativeInfoStep, REPRESENTATIVE_TITLES } from '@/components/checkout/RepresentativeInfoStep';
import { Organization, OrganizationCreateRequest } from '@/types/organization/organization.type';

import {
  Modal,
  ModalContent,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const getTitleLabel = (value: string | undefined | null) => {
  if (!value) return "Chưa cập nhật";
  const title = REPRESENTATIVE_TITLES.find(t => t.value === value);
  return title ? title.label : value;
};

interface SecurityTabProps {
  userData: UserData | null;
  enabling2FA: boolean;
  handleEnable2FA: () => Promise<void>;
  handleDisable2FA: () => Promise<void>;
}

const userService = new UserService()
const authService = new AuthService()
const notificationService = new NotificationService();

interface ProfileDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProfileDialog({ open = true, onOpenChange }: ProfileDialogProps = {}) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState<string>('')
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const router = useRouter()
  const { showToast } = useToast()



  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Form states
  const [name, setName] = useState('')
  const [saving, setSaving] = useState<boolean>(false)

  // 2FA states
  const [enabling2FA, setEnabling2FA] = useState(false)
  const [enable2FAData, setEnable2FAData] = useState<Enable2FAResponse | null>(null)

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)



  // Organization state
  const [organizationData, setOrganizationData] = useState<Organization | null>(null);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editOrgData, setEditOrgData] = useState({
    representative_email: '',
    representative_name: '',
    representative_phone: '',
    representative_title: '',
    tax_code: '',
  });

  // Backup code
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [generatingBackupCodes, setGeneratingBackupCodes] = useState(false)

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

  const resetState = () => {
    setUserData(null)
    setName('')
    setNotifications([])
    setOrganizationData(null)
    setAvatarPreview(null)
    setActiveTab('profile')
    setEnabling2FA(false)
    setEnable2FAData(null)
    setShowChangePassword(false)
    setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setBackupCodes([])
    setShowBackupCodes(false)
    setIsCreatingOrg(false)
    setIsEditingOrg(false)
    setTwoFactorCode('')
    setError(null)
  }

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }

    const fetchUser = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = authStorage.getAccessToken()
        const refreshToken = authStorage.getRefreshToken()
        const userID = authStorage.getUserID()

        if (!token || !refreshToken) {
          setError('Vui lòng đăng nhập')
          onOpenChange?.(false)
          router.push('/login')
          return
        }

        const data = await userService.getUser(token, refreshToken)
        if (data) {
          setUserData(data)
          setName(data.user?.name || '')
        }

        const userNotifsResponse = await notificationService.getNotifications(token);
        const getGlobalNotifications = await notificationService.getGlobalNotifications(token);
        const userNotifs = userNotifsResponse?.items || [];
        setNotifications([...(getGlobalNotifications?.items || []), ...userNotifs]);

        const listOrganization = await organizationService.getOrganizations(token);
        console.log(listOrganization.items);

        const organization = listOrganization.items.find((o: Organization) => o.owner.id == userID);
        // Fetch organization if user has one
        if (organization) {
          try {
            const org = await organizationService.getOrganizationById(token, organization.id);
            console.log(org)
            setOrganizationData(org);
          } catch (error) {
            console.error("Failed to fetch organization", error);
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err)
        setError('Đã xảy ra lỗi khi tải thông tin người dùng')
      } finally {
        setLoading(false)
      }
    }

    fetchUser();
  }, [router, open])

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
        showToast('Cập nhật thông tin thành công', 'success')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật thông tin'
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationData) return;
    setSaving(true);
    try {
      const token = authStorage.getAccessToken();
      if (!token) {
        showToast('Vui lòng đăng nhập lại', 'error');
        router.push('/login');
        return;
      }

      const response = await organizationService.updateOrganization(token, organizationData.id, editOrgData);
      if (response) {
        setOrganizationData({ ...organizationData, ...editOrgData });
        showToast('Cập nhật thông tin doanh nghiệp thành công', 'success');
        setIsEditingOrg(false);
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật thông tin doanh nghiệp'
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    if (organizationData) {
      setEditOrgData({
        representative_email: organizationData.representative_email || '',
        representative_name: organizationData.representative_name || '',
        representative_phone: organizationData.representative_phone || '',
        representative_title: organizationData.representative_title || '',
        tax_code: organizationData.tax_code || '',
      });
      setIsEditingOrg(true);
    }
  };

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
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi đổi mật khẩu'
      showToast(message, 'error')
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
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi bật 2FA'
      showToast(message, 'error')
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
        const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tắt xác thực 2 yếu tố'
        showToast(message, 'error')
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

  const handleLogout = async () => {
    const token = authStorage.getAccessToken();
    const refresh_token = authStorage.getRefreshToken();
    if (token && refresh_token) {
      try {
        const response = await authService.logout(token, refresh_token);
        authStorage.clearTokens();
        resetState();
        onOpenChange?.(false);
        if (response) {
          showToast(response.message, 'success');
        } else {
          showToast('Đăng xuất thành công', 'success');
        }
      } catch {
        authStorage.clearTokens();
        resetState();
        onOpenChange?.(false);
        showToast('Đăng xuất thành công', 'info');
      }
      router.push('/');
      router.refresh();
    } else {
      showToast('Vui lòng đăng nhập lại', 'error');
      router.push('/login');
    }
  };

  const handleGenerateBackupCodes = async () => {
    setGeneratingBackupCodes(true)
    try {
      // TODO: Thay thế bằng API call thật
      const access_token = authStorage.getAccessToken();
      const access_verification_token = authStorage.getVerificationToken();

      if (access_token == null || access_verification_token == null) {
        showToast("Có lỗi trong quá trình tạo backup code", 'error')
      }

      const response = await authService.generateBackupcode(access_token!, access_verification_token!)

      if (response.success) {
        setBackupCodes(response.data.backup_codes)
        setShowBackupCodes(true)
        showToast('Mã dự phòng đã được tạo thành công', 'success')

        setTimeout(() => {
          setShowBackupCodes(false)
          setBackupCodes([])
          showToast('Mã dự phòng đã bị ẩn', 'info')
        }, 10000)
      } else {
        setShowBackupCodes(false)
        setBackupCodes([])
        showToast('Tạo mã dự phòng không thành công', 'error')
      }

    } catch (error) {
      console.error('Error generating backup codes:', error)
      showToast(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo mã dự phòng', 'error')
    } finally {
      setGeneratingBackupCodes(false)
    }
  }

  // HÀM SAO CHÉP BACKUP CODES - ĐÃ THÊM MỚI
  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    navigator.clipboard.writeText(codesText)
    showToast('Đã sao chép mã dự phòng vào clipboard', 'success')
  }

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
                className="bg-brand dark:hover:bg-green-900/20 hover:bg-brand/90 border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-400"
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
                width={192}
                height={192}
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
      {/* Backup Codes Section - ĐÃ THÊM MỚI */}
      {userData?.user?.two_factor_enabled && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="flex-1">
            <h3 className="font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Mã dự phòng
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tạo mã dự phòng để khôi phục tài khoản khi mất thiết bị 2FA
            </p>
          </div>
          <Button
            onClick={handleGenerateBackupCodes}
            disabled={generatingBackupCodes || showBackupCodes}
            className="bg-brand hover:bg-brand/90 cursor-pointer border-green-200 dark:border-red-900/50 text-green-600 dark:text-green-400 dark:hover:bg-green-900/20"
          >
            {generatingBackupCodes ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo...
              </>
            ) : (
              'Tạo mã dự phòng'
            )}
          </Button>
        </div>
      )}
      {/* Backup Codes Display - ĐÃ THÊM MỚI */}
      {showBackupCodes && backupCodes.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand" />
                Mã dự phòng của bạn
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Lưu các mã này ở nơi an toàn. Mỗi mã chỉ có thể sử dụng một lần.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyBackupCodes}
              className="shrink-0"
            >
              Sao chép tất cả
            </Button>
          </div>

          {/* Warning Notice */}
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-300">Lưu ý quan trọng!</p>
              <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                Mã dự phòng sẽ tự động ẩn sau 10 giây. Hãy lưu chúng ngay bây giờ!
              </p>
            </div>
          </div>

          {/* Backup Codes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-6">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <code className="flex-1 font-mono text-sm font-medium text-slate-900 dark:text-white">
                  {code}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(code)
                    showToast('Đã sao chép mã', 'success')
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                  title="Sao chép mã"
                >
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>Mẹo:</strong> In hoặc lưu các mã này vào trình quản lý mật khẩu của bạn. Không chia sẻ với bất kỳ ai!
            </p>
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedType === type.value
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
                  className={`p-4 rounded-lg border transition-colors ${getTypeColor(notification.type)
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

  // Removed standalone loading and error returns to render inside Modal


  const handleVerify2FACode = async () => {
    if (twoFactorCode.length !== 6) return

    setIsSubmitting2FA(true)
    try {
      const token = authStorage.getAccessToken()
      const access_verification_token = authStorage.getVerificationToken() || ''
      if (!token) {
        showToast('Vui lòng đăng nhập lại', 'error')
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
      showToast(error instanceof Error ? error.message : 'Xác thực 2FA thất bại', 'error')
    } finally {
      setIsSubmitting2FA(false)
    }
  }

  // Pre-fetching conditional returns moved inside render
  // if (!userData) return null // Removed early return to handle in render


  const handleClose = (open: boolean) => {
    if (!open && onOpenChange) {
      onOpenChange(false)
    }
  }

  const OrganizationCreationForm = ({ onSuccess, onCancel }: { onSuccess: (data: Organization) => void, onCancel: () => void }) => {
    const [companyData, setCompanyData] = useState<Partial<OrganizationCreateRequest>>({});
    const [repData, setRepData] = useState<Partial<OrganizationCreateRequest>>({});
    const [isCompanyValid, setIsCompanyValid] = useState(false);
    const [isRepValid, setIsRepValid] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { showToast } = useToast();

    const handleCreate = async () => {
      setSubmitting(true);
      try {
        const token = authStorage.getAccessToken();
        if (!token) {
          showToast('Vui lòng đăng nhập lại', 'error');
          return;
        }

        // Kiểm tra xác minh email
        const isVerified = authStorage.getEmailVerified();
        if (isVerified !== 'true' && isVerified !== '1') {
          showToast("Tài khoản chưa được xác minh. Vui lòng xác minh email để tiếp tục.", "error");
          setSubmitting(false);
          return;
        }

        const payload = {
          ...companyData,
          ...repData
        };

        const newOrg = await organizationService.createOrganization(token, payload as OrganizationCreateRequest);
        showToast("Tạo thông tin doanh nghiệp thành công", "success");
        onSuccess(newOrg);
      } catch (error) {
        console.error(error);
        if (error instanceof Error) {
          showToast(error.message || "Có lỗi xảy ra khi tạo doanh nghiệp", "error");
        } else {
          showToast("Có lỗi xảy ra khi tạo doanh nghiệp", "error");
        }
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <CheckoutProvider>
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <CompanyInfoStep
              onChange={(data: Partial<OrganizationCreateRequest>, isValid: boolean) => {
                setCompanyData(data);
                setIsCompanyValid(isValid);
              }}
              allowEdit={true}
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <RepresentativeInfoStep
              onChange={(data: Partial<OrganizationCreateRequest>, isValid: boolean) => {
                setRepData(data);
                setIsRepValid(isValid);
              }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onCancel} disabled={submitting}>
              Hủy bỏ
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!isCompanyValid || !isRepValid || submitting}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Tạo hồ sơ doanh nghiệp
            </Button>
          </div>
        </div>
      </CheckoutProvider>
    );
  };

  const SidebarContent = () => (
    <nav className="space-y-1">
      <button
        onClick={() => setActiveTab('profile')}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all text-sm font-medium",
          activeTab === 'profile'
            ? "bg-brand/10 text-brand"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <User className="w-5 h-5" />
        Tài khoản của tôi
      </button>
      <button
        onClick={() => setActiveTab('security')}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all text-sm font-medium",
          activeTab === 'security'
            ? "bg-brand/10 text-brand"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Shield className="w-5 h-5" />
        Bảo mật
      </button>
      <button
        onClick={() => setActiveTab('notifications')}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all text-sm font-medium",
          activeTab === 'notifications'
            ? "bg-brand/10 text-brand"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Bell className="w-5 h-5" />
        Thông báo
        {notifications.some(n => !n.is_read) && (
          <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </button>
      <button
        onClick={() => setActiveTab('organization')}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all text-sm font-medium",
          activeTab === 'organization'
            ? "bg-brand/10 text-brand"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Building className="w-5 h-5" />
        Thông tin doanh nghiệp
      </button>
    </nav>
  )

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent
        className={cn(
          "modal-profile-lg p-0 gap-0 bg-background overflow-hidden"
        )}
      >
        {/* Hidden accessible title */}
        <ModalTitle className="sr-only">Hồ sơ cá nhân</ModalTitle>
        {loading ? (
          <div className="h-[500px] flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        ) : error ? (
          <div className="h-[500px] flex items-center justify-center flex-col gap-5 bg-slate-50">
            <div className="bg-white p-6 rounded shadow border border-red-200 text-red-600">
              {error}
            </div>
            <button onClick={() => {
              router.push('/login')
              onOpenChange?.(false)
            }} className="bg-red-700 hover:bg-red-800 text-white font-medium px-8 py-3 rounded-lg transition-all shadow-lg shadow-red-700/20 hover:shadow-red-700/40 flex items-center gap-2 justify-center active:scale-[0.98]">Đăng nhập</button>
          </div>
        ) : userData ? (
          <div className="flex flex-col md:flex-row h-full max-h-[90vh] md:max-h-screen w-full bg-background text-slate-950 overflow-hidden">
            {/* Sidebar Column */}
            <div className="w-full md:w-[280px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 flex flex-col overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center gap-3 text-xl font-bold text-brand">
                  <Image
                    src="/assets/GenHub.svg"
                    alt="GenHub Logo"
                    width={100}
                    height={32}
                    className="h-8 w-auto"
                  />
                </div>
                <ModalDescription className="text-xs text-slate-600 mt-2 font-medium">
                  Quản lý thông tin cá nhân và bảo mật
                </ModalDescription>
              </div>

              <div className="px-4 flex-1 overflow-y-auto">
                <SidebarContent />
              </div>


            </div>

            {/* Main Content Column */}
            <div className="flex-1 flex flex-col min-w-0 bg-background dark:bg-slate-950 overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
                  <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      {activeTab === 'profile' && 'Hồ sơ của tôi'}
                      {activeTab === 'security' && 'Bảo mật & Đăng nhập'}
                      {activeTab === 'notifications' && 'Thông báo'}
                      {activeTab === 'organization' && 'Thông tin doanh nghiệp'}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      {activeTab === 'profile' && 'Quản lý thông tin hồ sơ của bạn để bảo mật tài khoản'}
                      {activeTab === 'security' && 'Quản lý mật khẩu và xác thực 2 yếu tố'}
                      {activeTab === 'notifications' && 'Xem và quản lý các thông báo từ hệ thống'}
                      {activeTab === 'organization' && 'Thông tin doanh nghiệp và xuất hóa đơn'}
                    </p>
                  </div>

                  {activeTab === 'profile' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col-reverse xl:flex-row gap-10">
                        <div className="flex-1 space-y-8">
                          <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Tên hiển thị
                                </label>
                                <Input
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                  placeholder="Nhập tên hiển thị của bạn"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Email
                                </label>
                                <div className="relative">
                                  <Input
                                    value={userData.user.email}
                                    disabled
                                    className="h-11 pl-10 bg-slate-100 dark:bg-slate-900/50 text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed font-mono"
                                  />
                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Email không thể thay đổi</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4">
                              <Button
                                type="submit"
                                disabled={saving}
                                className="bg-brand hover:bg-brand/90 text-white min-w-[140px] h-11"
                              >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Lưu thay đổi
                              </Button>
                            </div>
                          </form>

                          <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-6">
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Đổi mật khẩu</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Nên sử dụng mật khẩu mạnh để bảo vệ tài khoản</p>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => setShowChangePassword(!showChangePassword)}
                                className={cn(
                                  "border-slate-200 dark:border-slate-700",
                                  showChangePassword && "bg-slate-100 dark:bg-slate-800"
                                )}
                              >
                                {showChangePassword ? 'Hủy bỏ' : 'Đổi mật khẩu'}
                              </Button>
                            </div>

                            {showChangePassword && (
                              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2">
                                <div className="space-y-5 max-w-md">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                      Mật khẩu hiện tại <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                      type="password"
                                      name="currentPassword"
                                      value={changePasswordData.currentPassword}
                                      onChange={handlePasswordChange}
                                      className="bg-white dark:bg-slate-950"
                                      placeholder="••••••••"
                                    />
                                    {passwordErrors.currentPassword && (
                                      <p className="text-xs text-red-500">{passwordErrors.currentPassword}</p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                      Mật khẩu mới <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                      type="password"
                                      name="newPassword"
                                      value={changePasswordData.newPassword}
                                      onChange={handlePasswordChange}
                                      className="bg-white dark:bg-slate-950"
                                      placeholder="••••••••"
                                    />
                                    {passwordErrors.newPassword && (
                                      <p className="text-xs text-red-500">{passwordErrors.newPassword}</p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                      Xác nhận mật khẩu <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                      type="password"
                                      name="confirmPassword"
                                      value={changePasswordData.confirmPassword}
                                      onChange={handlePasswordChange}
                                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitPasswordChange()}
                                      className="bg-white dark:bg-slate-950"
                                      placeholder="••••••••"
                                    />
                                    {passwordErrors.confirmPassword && (
                                      <p className="text-xs text-red-500">{passwordErrors.confirmPassword}</p>
                                    )}
                                  </div>
                                  <div className="pt-2">
                                    <Button
                                      onClick={handleSubmitPasswordChange}
                                      disabled={loading}
                                      className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                                    >
                                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                      Cập nhật mật khẩu
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="w-full xl:w-72 shrink-0">
                          <div className="sticky top-0">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Ảnh đại diện</h3>
                            <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
                              <div className="relative mb-6 group">
                                <div className="absolute inset-0 bg-brand/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <Avatar className="h-32 w-32 border-4 border-white dark:border-slate-800 shadow-xl relative z-10">
                                  <AvatarImage className="object-cover" src={avatarPreview || `https://www.gravatar.com/avatar/${userData.user.email ? userData.user.email : 'default'}?d=mp`} alt={userData.user.name} />
                                  <AvatarFallback className="text-4xl font-bold bg-brand/10 text-brand">
                                    {userData.user.name ? userData.user.name.charAt(0).toUpperCase() : 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                {true && (
                                  <div className="absolute bottom-1 right-2 z-20 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm border border-slate-100 dark:border-slate-800" title="Verified">
                                    <svg className="w-5 h-5 text-brand fill-current" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                  </div>
                                )}
                              </div>

                              <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{userData.user.name}</h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 truncate max-w-[200px]">{userData.user.email}</p>

                              <AvatarUploader onUpload={handleAvatarUpload}>
                                <Button variant="outline" size="sm" className="w-full gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                  <Upload className="w-4 h-4" />
                                  Thay đổi ảnh
                                </Button>
                              </AvatarUploader>
                              <p className="text-xs text-slate-400 mt-4 px-2">
                                Hỗ trợ JPG, PNG. Tối đa 5MB.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-10 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                        <Button
                          variant="ghost"
                          onClick={handleLogout}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                          Đăng xuất khỏi thiết bị này
                        </Button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <SecurityTab
                        userData={userData}
                        enabling2FA={enabling2FA}
                        handleEnable2FA={handleEnable2FA}
                        handleDisable2FA={handleDisable2FA}
                      />
                    </div>
                  )}

                  {activeTab === 'notifications' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <NotificationsTab notifications={notifications} />
                    </div>
                  )}

                  {activeTab === 'organization' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-800 p-5 md:p-8 space-y-6">
                        {organizationData ? (
                          isEditingOrg ? (
                            <form onSubmit={handleUpdateOrganization} className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mã số thuế</label>
                                  <Input
                                    value={editOrgData.tax_code}
                                    onChange={(e) => setEditOrgData({ ...editOrgData, tax_code: e.target.value })}
                                    className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                    placeholder="Nhập mã số thuế"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tên người đại diện</label>
                                  <Input
                                    value={editOrgData.representative_name}
                                    onChange={(e) => setEditOrgData({ ...editOrgData, representative_name: e.target.value })}
                                    className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                    placeholder="Nhập tên người đại diện"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email người đại diện</label>
                                  <Input
                                    value={editOrgData.representative_email}
                                    onChange={(e) => setEditOrgData({ ...editOrgData, representative_email: e.target.value })}
                                    className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                    placeholder="Nhập email người đại diện"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Số điện thoại người đại diện</label>
                                  <Input
                                    value={editOrgData.representative_phone}
                                    onChange={(e) => setEditOrgData({ ...editOrgData, representative_phone: e.target.value })}
                                    className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                    placeholder="Nhập số điện thoại"
                                  />
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chức vụ người đại diện</label>
                                  <Select
                                    value={editOrgData.representative_title}
                                    onValueChange={(value) => setEditOrgData({ ...editOrgData, representative_title: value })}
                                  >
                                    <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                      <SelectValue placeholder="Chọn chức vụ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {REPRESENTATIVE_TITLES.map((title) => (
                                        <SelectItem key={title.value} value={title.value}>
                                          {title.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button type="button" variant="outline" onClick={() => setIsEditingOrg(false)} disabled={saving}>
                                  Hủy bỏ
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={saving}
                                  className="bg-brand text-white min-w-35">
                                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Lưu thay đổi
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase">{organizationData.name}</h2>
                                <Button variant="outline" size="sm" onClick={startEditing} className="gap-2 border-slate-200 dark:border-slate-700">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                  Chỉnh sửa
                                </Button>
                              </div>
                              <div className="flex justify-between items-center mb-6">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{organizationData.international_name || "Tên quốc tế: Chưa cập nhật"}</p>
                                <div className="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 px-3 py-1 rounded-full text-xs font-semibold border border-teal-100 dark:border-teal-800 flex items-center">
                                  Doanh nghiệp thân thiết
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Mã số thuế</label>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 font-mono font-medium text-slate-900 dark:text-white">
                                    {organizationData.tax_code}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Người đại diện</label>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white">
                                    {organizationData.representative_name || "Chưa cập nhật"}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Chức vụ</label>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white">
                                    {getTitleLabel(organizationData.representative_title)}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Email liên hệ</label>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white">
                                    {organizationData.representative_email || "Chưa cập nhật"}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Số điện thoại</label>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white">
                                    {organizationData.representative_phone || "Chưa cập nhật"}
                                  </div>
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-1">
                                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Địa chỉ trụ sở</label>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                                    {organizationData.headquarters_address}
                                  </div>
                                </div>
                              </div>
                            </>
                          )
                        ) : isCreatingOrg ? (
                          <OrganizationCreationForm
                            onSuccess={(newOrg) => {
                              setOrganizationData(newOrg);
                              setIsCreatingOrg(false);
                            }}
                            onCancel={() => setIsCreatingOrg(false)}
                          />
                        ) : (
                          <div className="text-center py-10">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Building className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Chưa có thông tin doanh nghiệp</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2 mb-6">
                              Tài khoản của bạn chưa được liên kết với doanh nghiệp nào. Bạn có thể cập nhật thông tin ngay bây giờ để thuận tiện cho việc thuê kho sau này.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md mx-auto">
                              <Button
                                onClick={() => setIsCreatingOrg(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                              >
                                Tạo hồ sơ doanh nghiệp
                              </Button>
                              <Button
                                onClick={() => router.push('/kho-bai')}
                                variant="outline"
                                className="w-full sm:w-auto border-slate-200 dark:border-slate-700"
                              >
                                Tìm thuê kho ngay
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </ModalContent>
    </Modal>
  )

}
