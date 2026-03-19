'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { X, Phone, Mail, MapPin, Calendar as CalendarIcon, Clock, Check, Ban, Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import type { WarehouseVisit } from './types';

interface VisitDetailDrawerProps {
  visitId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const fetcher = (url: string) => api.get<{ data: WarehouseVisit }>(url).then((res) => res.data?.data);

type VisitStatusUpdatePayload = {
  confirmation_notes?: string;
  cancel_reason?: string;
  visitor_feedback?: string;
};

const getErrorMessage = (error: unknown): string => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }

  return 'Lỗi khi cập nhật trạng thái';
};

export default React.memo(function VisitDetailDrawer({ visitId, onClose, onSuccess }: VisitDetailDrawerProps) {
  const { data: visit, isLoading } = useSWR<WarehouseVisit>(visitId ? `/warehouse-visit/${visitId}` : null, fetcher);
  const { hasPermission } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'CONFIRM' | 'CANCEL' | 'COMPLETE' | null>(null);
  
  // Status payload requirements
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [visitorFeedback, setVisitorFeedback] = useState('');

  // Cập nhật reset form khi đổi ID
  useEffect(() => {
    setActionType(null);
    setConfirmationNotes('');
    setCancelReason('');
    setVisitorFeedback('');
  }, [visitId]);

  if (!visitId) return null;

  const handleStatusChange = async (status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED', payload: VisitStatusUpdatePayload) => {
    try {
      setIsSubmitting(true);
      if (status === 'CONFIRMED' || status === 'CANCELLED') {
         // Using the approve endpoint specifically designed for this?
         // Actually, either PATCH /:id/approve or PATCH /:id depends on roles.
         // Let's use PATCH /:id since it works universally and allows status updates
         await api.patch(`/warehouse-visit/${visitId}`, {
           status,
           ...payload
         });
      } else {
         await api.patch(`/warehouse-visit/${visitId}`, {
           status,
           ...payload
         });
      }
      
      toast.success('Cập nhật trạng thái lịch hẹn thành công');
      onSuccess(); // Close drawer & refresh list
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVisitTimePassed = () => {
    if (!visit) return false;
    const endDateTime = new Date(`${visit.visit_date.split('T')[0]}T${visit.visit_time_end}:00`);
    return new Date() > endDateTime;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">PENDING</span>;
      case 'CONFIRMED': return <span className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30">CONFIRMED</span>;
      case 'CANCELLED': return <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30">CANCELLED</span>;
      case 'COMPLETED': return <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-xs font-bold border border-gray-500/30">COMPLETED</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div 
        className={`fixed top-0 right-0 h-full w-[450px] max-w-full bg-[var(--background-secondary)] border-l border-[var(--border-primary)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${visitId ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h2 className="text-xl font-bold text-white glow-text">Chi tiết lịch hẹn</h2>
          <button onClick={onClose} className="p-2 bg-[var(--background-tertiary)] hover:bg-[var(--accent-primary-muted)] text-[var(--text-secondary)] hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
            </div>
          ) : visit ? (
            <>
              {/* Visitor Info */}
              <div className="bg-[var(--background-primary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                   <h3 className="text-lg font-bold text-white truncate pr-2">{visit.visitor_name}</h3>
                   {getStatusBadge(visit.status)}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-[rgba(0,153,255,0.1)] flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-[var(--accent-primary)]" />
                    </div>
                    <a href={`tel:${visit.visitor_phone}`} className="text-[var(--text-secondary)] hover:text-white hover:underline transition-colors">
                      {visit.visitor_phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-[rgba(0,153,255,0.1)] flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-[var(--accent-primary)]" />
                    </div>
                    <a href={`mailto:${visit.visitor_email}`} className="text-[var(--text-secondary)] hover:text-white hover:underline transition-colors truncate">
                      {visit.visitor_email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Visit Info */}
              <div className="bg-[var(--background-primary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Thông tin tham quan</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                    <MapPin className="w-5 h-5 text-[var(--text-muted)] mt-0.5 shrink-0" />
                    <div>
                      <span className="block font-medium text-white">{visit.warehouse_template?.name || 'Kho mẫu'}</span>
                      <span className="text-xs">Mã đặt: {visit.code}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <CalendarIcon className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
                    <span>{format(parseISO(visit.visit_date), "dd/MM/yyyy", { locale: vi })}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <Clock className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
                    <span>{visit.visit_time_start} - {visit.visit_time_end}</span>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-2 mt-2 border-t border-[var(--border-primary)]">
                    <div className="text-sm">
                      <span className="text-[var(--text-muted)]">Số lượng khách:</span>{' '}
                      <span className="text-white font-medium">{visit.number_of_visitors || 1} người</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-[var(--text-muted)]">Mục đích:</span>{' '}
                      <span className="text-white font-medium">{visit.purpose || 'Không rõ'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Forms */}
              {actionType === 'CONFIRM' && (
                <div className="bg-[rgba(21,128,61,0.05)] border border-green-500/20 p-4 rounded-xl animate-in slide-in-from-top-2">
                  <h4 className="text-green-500 font-semibold mb-2">Xác nhận lịch hẹn</h4>
                  <textarea 
                    className="w-full bg-[var(--background-primary)] border border-[var(--border-primary)] rounded-lg p-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-green-500 mb-3"
                    placeholder="Ghi chú xác nhận (Ví dụ: Đã gọi khách, khách đi 2 người...)"
                    rows={3}
                    value={confirmationNotes}
                    onChange={e => setConfirmationNotes(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setActionType(null)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white">Hủy</button>
                    <button 
                      onClick={() => handleStatusChange('CONFIRMED', { confirmation_notes: confirmationNotes })}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin"/>} Lưu xác nhận
                    </button>
                  </div>
                </div>
              )}

              {actionType === 'CANCEL' && (
                <div className="bg-[rgba(153,27,27,0.05)] border border-red-500/20 p-4 rounded-xl animate-in slide-in-from-top-2">
                  <h4 className="text-red-500 font-semibold mb-2">Từ chối / Hủy lịch</h4>
                  <textarea 
                    className="w-full bg-[var(--background-primary)] border border-red-500/30 rounded-lg p-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-red-500 mb-3"
                    placeholder="Bắt buộc nhập lý do hủy lịch..."
                    rows={3}
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setActionType(null)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white">Đóng</button>
                    <button 
                      onClick={() => handleStatusChange('CANCELLED', { cancel_reason: cancelReason })}
                      className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                      disabled={isSubmitting || !cancelReason.trim()}
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin"/>} Xác nhận Hủy
                    </button>
                  </div>
                </div>
              )}

              {actionType === 'COMPLETE' && (
                <div className="bg-[rgba(0,153,255,0.05)] border border-[var(--accent-primary)]/20 p-4 rounded-xl animate-in slide-in-from-top-2">
                  <h4 className="text-[var(--accent-primary)] font-semibold mb-2">Hoàn thành & Feedback</h4>
                  <textarea 
                    className="w-full bg-[var(--background-primary)] border border-[var(--border-primary)] rounded-lg p-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] mb-3"
                    placeholder="Bắt buộc nhập ý kiến của khách sau khi tham quan..."
                    rows={4}
                    value={visitorFeedback}
                    onChange={e => setVisitorFeedback(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setActionType(null)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white">Hủy</button>
                    <button 
                      onClick={() => handleStatusChange('COMPLETED', { visitor_feedback: visitorFeedback })}
                      className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-blue-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                      disabled={isSubmitting || !visitorFeedback.trim()}
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin"/>} Đánh dấu Hoàn thành
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!actionType && (
                <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-primary)]">
                  {visit.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={() => setActionType('CONFIRM')}
                        className="w-full py-3 bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white border border-green-500/30 font-medium rounded-xl transition-all flex justify-center items-center gap-2"
                      >
                        <Check className="w-5 h-5"/> Xác nhận lịch
                      </button>
                      
                      <button 
                        onClick={() => setActionType('CANCEL')}
                        className="w-full py-3 bg-transparent hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 font-medium rounded-xl transition-all flex justify-center items-center gap-2"
                      >
                        <Ban className="w-5 h-5"/> Từ chối / Hủy
                      </button>
                    </>
                  )}

                  {visit.status === 'CONFIRMED' && isVisitTimePassed() && (
                    <button 
                      onClick={() => setActionType('COMPLETE')}
                      className="w-full py-3 bg-[var(--accent-primary-muted)] hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white font-medium rounded-xl transition-all flex justify-center items-center gap-2 border border-[var(--accent-primary)]/30"
                    >
                      <Flag className="w-5 h-5"/> Đánh dấu Hoàn thành
                    </button>
                  )}

                  {visit.status === 'CONFIRMED' && !isVisitTimePassed() && (
                    <p className="text-center text-sm text-[var(--text-muted)] italic">
                      Lịch đang chờ diễn ra. Nút hoàn thành sẽ xuất hiện sau khi thời gian tham quan đã qua.
                    </p>
                  )}

                  {hasPermission('warehouse-visit.delete') && ['CANCELLED', 'COMPLETED'].includes(visit.status) && (
                     <button 
                        onClick={() => {
                           if(window.confirm('Bạn có chắc chắn muốn xóa mềm lịch hẹn này khỏi hệ thống?')) {
                             setIsSubmitting(true);
                             api.delete(`/warehouse-visit/${visitId}`)
                                .then(() => {
                                  toast.success('Đã xóa dữ liệu');
                                  onSuccess();
                                })
                                .finally(() => setIsSubmitting(false));
                           }
                        }}
                        disabled={isSubmitting}
                        className="w-full mt-4 py-2 bg-transparent hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 text-sm font-medium rounded-xl transition-all border border-transparent hover:border-red-500/20"
                     >
                       Xóa lịch (Super Admin)
                     </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-[var(--text-muted)]">
              Không tải được dữ liệu
            </div>
          )}
        </div>
      </div>
    </>
  );
});
