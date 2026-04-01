'use client'

import Link from 'next/link'
import { Home, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error404Page() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900/60 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            404
          </h1>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Không tìm thấy trang
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Trang bạn yêu cầu có thể đã bị xóa, đổi tên hoặc tạm thời không khả dụng.
          </p>
        </div>

        {/* Gợi ý / nút điều hướng */}
        <div className="px-8 pb-8 pt-4 space-y-4 text-center">
          <p className="text-sm text-slate-400">
            Bạn có thể kiểm tra lại đường dẫn hoặc quay về trang chủ.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
            >
              <Home className="w-4 h-4" />
              <span>Về trang chủ</span>
            </Link>

            <Button
              type="button"
              variant="outline"
              onClick={() => typeof window !== 'undefined' && window.history.back()}
              className="px-5 py-3 rounded-lg border-slate-600 bg-slate-800/60 text-slate-200 hover:bg-slate-700 hover:border-slate-500"
            >
              <span>Quay lại trang trước</span>
            </Button>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Nếu bạn nghĩ đây là lỗi hệ thống, hãy liên hệ quản trị viên.
          </p>
        </div>
      </div>
    </div>
  )
}