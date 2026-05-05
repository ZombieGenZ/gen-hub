'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseVisitService } from '@/services/warehouse-visit/warehouse-visit.service';
import { authStorage } from '@/services/auth/auth-storage.service';
import { toast } from 'sonner';
import {
  XMarkIcon as XIcon,
  PhoneIcon,
  EnvelopeIcon as MailIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  NoSymbolIcon as BanIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface VisitDetailDrawerProps {
  visitId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VisitDetailDrawer({ visitId, onClose, onSuccess }: VisitDetailDrawerProps) {
  const queryClient = useQueryClient();

  const token = authStorage.getAccessToken() || '';

  const { data: visit, isLoading } = useQuery({
    queryKey: ['warehouse-visit', visitId],
    queryFn: () => warehouseVisitService.getBookingById(token, visitId as string),
    enabled: !!visitId && !!token,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'CONFIRM' | 'CANCEL' | 'COMPLETE' | null>(null);

  // Status payload requirements
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [visitorFeedback, setVisitorFeedback] = useState('');

  // Reset form when ID changes
  useEffect(() => {
    setActionType(null);
    setConfirmationNotes('');
    setCancelReason('');
    setVisitorFeedback('');
  }, [visitId]);

  if (!visitId) return null;

  const handleStatusChange = async (status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED', payload: any) => {
    if (!token) return;
    try {
      setIsSubmitting(true);
      await warehouseVisitService.updateStatus(token, visitId, {
        status,
        ...payload
      });

      toast.success('Cập nhật trạng thái lịch hẹn thành công');
      onSuccess(); // Close drawer & refresh list
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi cập nhật trạng thái');
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
      case 'PENDING': return <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-500 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-500/30">PENDING</span>;
      case 'CONFIRMED': return <span className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-200 dark:border-green-500/30">CONFIRMED</span>;
      case 'CANCELLED': return <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-200 dark:border-red-500/30">CANCELLED</span>;
      case 'COMPLETED': return <span className="bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 dark:border-gray-500/30">COMPLETED</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div
        className={`fixed top-0 right-0 h-full w-[450px] max-w-full bg-background border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${visitId ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
        role="dialog"
        aria-label="Chi tiết lịch hẹn"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Chi tiết lịch hẹn</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors" aria-label="Đóng">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <svg className="animate-spin h-8 w-8 text-teal-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          ) : visit ? (
            <>
              {/* Visitor Info */}
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-foreground truncate pr-2">{visit.visitor_name}</h3>
                  {getStatusBadge(visit.status)}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center shrink-0">
                      <PhoneIcon className="w-4 h-4 text-teal-600" />
                    </div>
                    <a href={`tel:${visit.visitor_phone}`} className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                      {visit.visitor_phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center shrink-0">
                      <MailIcon className="w-4 h-4 text-teal-600" />
                    </div>
                    <a href={`mailto:${visit.visitor_email}`} className="text-muted-foreground hover:text-foreground hover:underline transition-colors truncate">
                      {visit.visitor_email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Visit Info */}
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Thông tin tham quan</h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <MapPinIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <span className="block font-medium text-foreground">{(visit as any).warehouse_template?.name || 'Kho mẫu'}</span>
                      <span className="text-xs">Mã đặt: {(visit as any).code}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CalendarIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span>{format(parseISO(visit.visit_date), "dd/MM/yyyy", { locale: vi })}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <ClockIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span>{visit.visit_time_start} - {visit.visit_time_end}</span>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-2 mt-2 border-t border-border">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Số lượng khách:</span>{' '}
                      <span className="text-foreground font-medium">{visit.number_of_visitors || 1} người</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Mục đích:</span>{' '}
                      <span className="text-foreground font-medium">{visit.purpose || 'Không rõ'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Forms */}
              {actionType === 'CONFIRM' && (
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4 rounded-xl animate-in slide-in-from-top-2">
                  <h4 className="text-green-600 dark:text-green-500 font-semibold mb-2">Xác nhận lịch hẹn</h4>
                  <textarea
                    className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500 mb-3"
                    placeholder="Ghi chú xác nhận (Ví dụ: Đã gọi khách, khách đi 2 người...)"
                    rows={3}
                    value={confirmationNotes}
                    onChange={e => setConfirmationNotes(e.target.value)}
                    aria-label="Ghi chú xác nhận"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setActionType(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Hủy</button>
                    <button
                      onClick={() => handleStatusChange('CONFIRMED', { confirmation_notes: confirmationNotes })}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Đang lưu...' : 'Lưu xác nhận'}
                    </button>
                  </div>
                </div>
              )}

              {actionType === 'CANCEL' && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-xl animate-in slide-in-from-top-2">
                  <h4 className="text-red-600 dark:text-red-500 font-semibold mb-2">Từ chối / Hủy lịch</h4>
                  <textarea
                    className="w-full bg-background border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500 mb-3"
                    placeholder="Bắt buộc nhập lý do hủy lịch..."
                    rows={3}
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    aria-label="Lý do hủy lịch"
                    aria-required="true"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setActionType(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Đóng</button>
                    <button
                      onClick={() => handleStatusChange('CANCELLED', { cancel_reason: cancelReason })}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                      disabled={isSubmitting || !cancelReason.trim()}
                    >
                      {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Hủy'}
                    </button>
                  </div>
                </div>
              )}

              {actionType === 'COMPLETE' && (
                <div className="bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 p-4 rounded-xl animate-in slide-in-from-top-2">
                  <h4 className="text-teal-600 dark:text-teal-500 font-semibold mb-2">Hoàn thành & Feedback</h4>
                  <textarea
                    className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-teal-500 mb-3"
                    placeholder="Bắt buộc nhập ý kiến của khách sau khi tham quan..."
                    rows={4}
                    value={visitorFeedback}
                    onChange={e => setVisitorFeedback(e.target.value)}
                    aria-label="Ý kiến khách tham quan"
                    aria-required="true"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setActionType(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Hủy</button>
                    <button
                      onClick={() => handleStatusChange('COMPLETED', { visitor_feedback: visitorFeedback })}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                      disabled={isSubmitting || !visitorFeedback.trim()}
                    >
                      {isSubmitting ? 'Đang xử lý...' : 'Đánh dấu Hoàn thành'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!actionType && (
                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                  {visit.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => setActionType('CONFIRM')}
                        className="w-full py-3 bg-green-50 hover:bg-green-600 text-green-600 hover:text-white dark:bg-green-500/20 dark:hover:bg-green-600 dark:text-green-500 border border-green-200 dark:border-green-500/30 font-medium rounded-xl transition-all flex justify-center items-center gap-2"
                      >
                        <CheckIcon className="w-5 h-5" /> Xác nhận lịch
                      </button>

                      <button
                        onClick={() => setActionType('CANCEL')}
                        className="w-full py-3 bg-transparent hover:bg-red-50 text-muted-foreground hover:text-red-600 dark:hover:bg-red-500/10 font-medium rounded-xl transition-all flex justify-center items-center gap-2"
                      >
                        <BanIcon className="w-5 h-5" /> Từ chối / Hủy
                      </button>
                    </>
                  )}

                  {visit.status === 'CONFIRMED' && isVisitTimePassed() && (
                    <button
                      onClick={() => setActionType('COMPLETE')}
                      className="w-full py-3 bg-teal-50 hover:bg-teal-600 text-teal-600 hover:text-white dark:bg-teal-500/20 dark:hover:bg-teal-600 dark:text-teal-500 font-medium rounded-xl transition-all flex justify-center items-center gap-2 border border-teal-200 dark:border-teal-500/30"
                    >
                      <FlagIcon className="w-5 h-5" /> Đánh dấu Hoàn thành
                    </button>
                  )}

                  {visit.status === 'CONFIRMED' && !isVisitTimePassed() && (
                    <p className="text-center text-sm text-muted-foreground italic">
                      Lịch đang chờ diễn ra. Nút hoàn thành sẽ xuất hiện sau khi thời gian tham quan đã qua.
                    </p>
                  )}

                  {['CANCELLED', 'COMPLETED'].includes(visit.status) && (
                    <button
                      onClick={() => {
                        if (window.confirm('Bạn có chắc chắn muốn xóa mềm lịch hẹn này khỏi hệ thống?')) {
                          setIsSubmitting(true);
                          warehouseVisitService.deleteBooking(token, visit.id)
                            .then(() => {
                              toast.success('Đã xóa dữ liệu');
                              onSuccess();
                            })
                            .catch(err => toast.error(err.message || 'Lỗi xóa'))
                            .finally(() => setIsSubmitting(false));
                        }
                      }}
                      disabled={isSubmitting}
                      className="w-full mt-4 py-2 bg-transparent hover:bg-red-50 text-muted-foreground hover:text-red-500 dark:hover:bg-red-500/10 text-sm font-medium rounded-xl transition-all border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
                    >
                      Xóa lịch (Super Admin)
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              Không tải được dữ liệu
            </div>
          )}
        </div>
      </div>
    </>
  );
}
