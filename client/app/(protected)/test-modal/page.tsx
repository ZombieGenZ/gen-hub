'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function TestModalPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Test Profile Modal
                </h1>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg space-y-4">
                    <p className="text-slate-700 dark:text-slate-300">
                        Click các button bên dưới để test modal profile:
                    </p>

                    {/* Using Link component */}
                    <Link
                        href="/user/profile"
                        className="block w-full bg-brand hover:bg-brand/90 text-white font-medium px-6 py-3 rounded-lg transition-colors text-center"
                    >
                        Mở Profile Modal (Link)
                    </Link>

                    {/* Using router.push */}
                    <button
                        onClick={() => router.push('/user/profile')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                    >
                        Mở Profile Modal (router.push)
                    </button>

                    <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Cách hoạt động:</h3>
                        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                            <li>Click button → Modal overlay xuất hiện trên trang này</li>
                            <li>Truy cập trực tiếp /user/profile → Redirect về dashboard</li>
                            <li>Modal có backdrop mờ phía sau</li>
                            <li>Click overlay hoặc nút X để đóng modal</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
