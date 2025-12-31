'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'
import { AuthService } from '@/services/auth/auth.service'
import { authStorage } from '@/services/auth/auth-storage.service'
import { useToast } from "@/contexts/ToastContext"

const authServices = new AuthService()

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  const [isChecking, setIsChecking] = useState(true)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setIsChecking(false)
      setIsSuccess(false)
      setMessage('Liên kết xác minh không hợp lệ hoặc đã hết hạn.')
      showToast('Liên kết xác minh không hợp lệ hoặc đã hết hạn.', 'error')
      router.replace('/error')
      return
    }

    const verify = async () => {
      try {
        const access_token = authStorage.getAccessToken()
        if (!access_token) {
          setMessage('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
          setIsSuccess(false)
          return;
        }
        const res: any = await authServices.confirmToken(access_token, token)
        if (res.success) {
          setIsSuccess(true)
          setMessage(res?.message || 'Xác minh email thành công, vui lòng đăng nhập lại.')
          authStorage.setEmailVerified("true")
        } else {
          setIsSuccess(false)
          setMessage('Xác minh email thất bại.')
          authStorage.setEmailVerified("false")
        }
      } catch (error: any) {
        console.error(error)
        setIsSuccess(false)
        setMessage(error?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.')
      } finally {
        setIsChecking(false)
      }
    }

    verify()
  }, [searchParams])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Đang xác minh email của bạn...
        </h1>
      </div>
    )
  }

  const isOk = isSuccess === true

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 text-center space-y-4">
          <div className="flex justify-center">
            {isOk ? (
              <CheckCircle2 className="h-16 w-16 text-success" />
            ) : (
              <XCircle className="h-16 w-16 text-red-400" />
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {isOk ? 'Xác minh email thành công' : 'Xác minh email thất bại'}
          </h1>

          <p className="text-slate-400">{message}</p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-brand text-white py-3 rounded-lg font-semibold hover:bg-brand-hover transition-colors shadow-lg shadow-brand/30"
            >
              Về trang chủ
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full inline-flex items-center justify-center py-3 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Đang tải...
        </h1>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}