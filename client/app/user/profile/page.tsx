'use client'

import { useEffect, useState } from 'react'
import { UserService } from '@/services/user/user.service'
import type { UserData } from '@/types/user/user.type'

const userService = new UserService()

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [twoFaLoading, setTwoFaLoading] = useState(false)
  const [twoFaMessage, setTwoFaMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        setError(null)

        // Lấy token theo cách bạn đang lưu (ví dụ localStorage)
        const token = localStorage.getItem('access_token')
        if (!token) {
          setError('Bạn chưa đăng nhập')
          setLoading(false)
          return
        }

        const data = await userService.getUser(token)

        if (!data) {
          setError('Không lấy được thông tin người dùng')
        } else {
          setUserData(data)
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

  if (loading) {
    return <div>Đang tải thông tin...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (!userData) {
    return <div>Không có dữ liệu người dùng.</div>
  }

  const { user, roles, permissions } = userData

  const handleEnable2FA = async () => {
        try {
            setTwoFaLoading(true)
            setTwoFaMessage(null)

            const token = localStorage.getItem('access_token')
            if (!token) {
            setTwoFaMessage('Bạn chưa đăng nhập')
            return
            }

            const res = await userService.enableTwoFactor(token)

            if (res?.success) {
            setTwoFaMessage('Bật 2FA thành công')
            // Cập nhật lại userData (gọi lại API hoặc set cứng)
            setUserData((prev) =>
                prev
                ? {
                    ...prev,
                    user: {
                        ...prev.user,
                        two_factor_enabled: true,
                    },
                    }
                : prev,
            )
            } else {
            setTwoFaMessage(res?.message || 'Bật 2FA thất bại')
            }
        } catch (err) {
            console.error(err)
            setTwoFaMessage('Đã xảy ra lỗi khi bật 2FA')
        } finally {
            setTwoFaLoading(false)
        }
    }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Thông tin cá nhân</h1>

      {/* Thông tin cơ bản */}
      <div className="border rounded-lg p-4 space-y-2">
        <p><strong>Tên:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Email xác nhận:</strong> {user.email_confirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</p>
        <p><strong>Tài khoản đã verify:</strong> {user.is_verified ? 'Đã verify' : 'Chưa verify'}</p>
        <p><strong>2FA:</strong> {user.two_factor_enabled ? 'Bật' : 'Tắt'}</p>
        <button
            onClick={handleEnable2FA}
            disabled={twoFaLoading || user.two_factor_enabled}
            className="mt-2 px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400"
        >
            {user.two_factor_enabled
            ? 'Đã bật 2FA'
            : twoFaLoading
            ? 'Đang bật 2FA...'
            : 'Bật xác thực 2FA'}
        </button>
        {twoFaMessage && (
            <p className="text-sm mt-1">{twoFaMessage}</p>
        )}
        <p><strong>Provider:</strong> {user.provider}</p>
        <p><strong>Ngày tạo:</strong> {new Date(user.created_at).toLocaleString()}</p>
      </div>

      {/* Roles */}
      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Vai trò (Roles)</h2>
        {roles.length === 0 && <p>Không có vai trò nào.</p>}
        {roles.map((role) => (
          <div key={role.id} className="mb-2">
            <p><strong>{role.name}</strong></p>
            <p className="text-sm text-gray-600">{role.description}</p>
          </div>
        ))}
      </div>

      {/* Permissions */}
      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Quyền (Permissions)</h2>
        {permissions.length === 0 && <p>Không có quyền nào.</p>}
        {permissions.map((permission) => (
          <div key={permission.id} className="mb-2">
            <p><strong>{permission.name}</strong> ({permission.key})</p>
            <p className="text-sm text-gray-600">{permission.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}