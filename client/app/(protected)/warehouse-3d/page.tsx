'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { warehouseService } from '@/services/warehouse/warehouse.service';
import { authStorage } from '@/services/auth/auth-storage.service';
import { Toaster, toast } from 'sonner';

function getToken() {
  return authStorage.getAccessToken() || '';
}

/**
 * Trang chọn kho — hiển thị danh sách warehouses thật từ API.
 * Sau khi chọn kho → navigate tới /warehouse-3d/[warehouseId] để xem 3D live.
 */
export default function WarehousePickerPage() {
  const router = useRouter();

  const {
    data: warehouses,
    isLoading,
    error,
    refetch,
  } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['warehouse-3d', 'list'],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error('Chưa đăng nhập');
      return warehouseService.listWarehouses(token);
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleSelectWarehouse = (id: string, name: string) => {
    toast.success(`Đang mở kho: ${name}`);
    router.push(`/warehouse-3d/${id}`);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <h1 className="text-2xl font-bold text-white">🏭 Kho 3D — Chọn Kho</h1>
        <p className="text-slate-400 text-sm mt-1">
          Chọn một kho để xem mô hình 3D với dữ liệu thực
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
              <p className="text-slate-400">Đang tải danh sách kho...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <div className="text-red-400 text-4xl mb-3">⚠</div>
              <h2 className="text-white text-lg font-semibold mb-2">Không thể tải danh sách kho</h2>
              <p className="text-slate-400 text-sm mb-4">
                {error instanceof Error ? error.message : 'Lỗi không xác định'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && warehouses?.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <div className="text-slate-500 text-5xl mb-3">📦</div>
              <h2 className="text-white text-lg font-semibold mb-2">Chưa có kho nào</h2>
              <p className="text-slate-400 text-sm">
                Tổ chức của bạn chưa có kho nào được tạo. Vui lòng liên hệ quản trị viên.
              </p>
            </div>
          </div>
        )}

        {/* Warehouse list */}
        {!isLoading && !error && warehouses && warehouses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((wh, index) => (
              <button
                key={wh.id}
                onClick={() => handleSelectWarehouse(wh.id, wh.name)}
                className="group p-6 bg-slate-800/60 border border-slate-700/50 rounded-xl 
                           hover:bg-slate-700/60 hover:border-blue-500/50 
                           transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center 
                                  group-hover:bg-blue-600/30 transition-colors">
                    <span className="text-2xl">🏭</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-lg truncate group-hover:text-blue-400 transition-colors">
                      {wh.name}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 font-mono truncate">
                      ID: {wh.id.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="text-slate-600 group-hover:text-blue-400 transition-colors">
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
