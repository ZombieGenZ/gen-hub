'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { WarehouseVisitService } from '@/services/warehouse-visit/warehouse-visit.service';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';

interface WarehouseVisitBookingFormProps {
    warehouseTemplateId: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const generateTimeSlots = () => {
    const slots = [];
    for (let i = 8; i <= 17; i++) {
        // Generate every 30 mins
        slots.push(`${i.toString().padStart(2, '0')}:00`);
        slots.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return slots;
};

export default React.memo(function WarehouseVisitBookingForm({ warehouseTemplateId, onSuccess, onCancel }: WarehouseVisitBookingFormProps) {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        visitor_name: '',
        visitor_email: '',
        visitor_phone: '',
        visit_date: '',
        visit_time_start: '',
        visit_time_end: '',
        purpose: 'Khảo sát kho',
        number_of_visitors: 1,
    });

    // Conflict Prevention State
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [isCheckingTime, setIsCheckingTime] = useState(false);
    const availableSlots = generateTimeSlots();

    useEffect(() => {
        // Khi người dùng chọn Ngày, FE gọi API để lấy danh sách các lịch đã CONFIRMED hoặc PENDING trong ngày đó
        const checkAvailability = async () => {
            if (!formData.visit_date || !warehouseTemplateId) return;
            
            setIsCheckingTime(true);
            try {
                const service = new WarehouseVisitService();
                
                // Giả định backend có hỗ trợ filter theo date và warehouse_template_id
                const responseMap = await Promise.all([
                   service.getBookings('', { date: formData.visit_date, status: 'CONFIRMED', limit: 100 }).catch(() => null),
                   service.getBookings('', { date: formData.visit_date, status: 'PENDING', limit: 100 }).catch(() => null)
                ]);
                
                const allBookings = [
                   ...(responseMap[0]?.data || []),
                   ...(responseMap[1]?.data || [])
                ].filter(b => b.warehouse_template_id === warehouseTemplateId);

                const occupied = [];
                for (const booking of allBookings) {
                    if (booking.visit_time_start) occupied.push(booking.visit_time_start.substring(0, 5));
                }
                setBookedSlots(occupied);
                
                // Reset time if current selected time is occupied
                if (formData.visit_time_start && occupied.includes(formData.visit_time_start)) {
                    setFormData(prev => ({ ...prev, visit_time_start: '', visit_time_end: '' }));
                    showToast('Khung giờ bạn chọn vừa có người đặt, vui lòng chọn giờ khác.', 'error');
                }
            } catch (error) {
                console.error("Failed to check availability", error);
            } finally {
                setIsCheckingTime(false);
            }
        };

        checkAvailability();
    }, [formData.visit_date, warehouseTemplateId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Auto-set end time to +30m for simplicity if start time changes
        if (name === 'visit_time_start' && value) {
            const [hours, minutes] = value.split(':').map(Number);
            const endDate = new Date();
            endDate.setHours(hours, minutes + 30, 0);
            setFormData(prev => ({ 
                ...prev, 
                visit_time_start: value,
                visit_time_end: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.visit_date || !formData.visit_time_start) {
            showToast('Vui lòng chọn ngày và giờ tham quan', 'error');
            return;
        }

        try {
            setIsLoading(true);
            const service = new WarehouseVisitService();
            // Lấy token nếu user đang login (hoặc không truyền nếu API cho phép public)
            // Giả định có token hoặc truyền empty string cho public API
            await service.createBooking('', {
                warehouse_template_id: warehouseTemplateId,
                visitor_name: formData.visitor_name,
                visitor_email: formData.visitor_email,
                visitor_phone: formData.visitor_phone,
                visit_date: formData.visit_date,
                visit_time_start: formData.visit_time_start,
                visit_time_end: formData.visit_time_end,
                purpose: formData.purpose as any,
                number_of_visitors: Number(formData.number_of_visitors)
            });
            
            showToast('Đặt lịch tham quan thành công! Vui lòng chờ nhân viên gọi xác nhận.', 'success');
            if (onSuccess) onSuccess();
        } catch (error: any) {
            showToast(error.message || 'Có lỗi xảy ra khi đặt lịch', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Get tomorrow as min date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split('T')[0];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="visitor_name">Họ và tên <span className="text-red-500">*</span></Label>
                <Input required id="visitor_name" name="visitor_name" value={formData.visitor_name} onChange={handleChange} placeholder="Nguyễn Văn A" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="visitor_phone">Số điện thoại <span className="text-red-500">*</span></Label>
                    <Input required id="visitor_phone" name="visitor_phone" type="tel" value={formData.visitor_phone} onChange={handleChange} placeholder="0909..." />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="visitor_email">Email <span className="text-red-500">*</span></Label>
                    <Input required id="visitor_email" name="visitor_email" type="email" value={formData.visitor_email} onChange={handleChange} placeholder="email@domain.com" />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="visit_date">Ngày tham quan <span className="text-red-500">*</span></Label>
                <Input required type="date" id="visit_date" name="visit_date" min={minDateStr} value={formData.visit_date} onChange={handleChange} />
            </div>

            <div className="space-y-2 relative">
                <div className="flex justify-between items-center">
                    <Label htmlFor="visit_time_start">Giờ tham quan <span className="text-red-500">*</span></Label>
                    {isCheckingTime && <span className="text-xs text-primary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Đang check lịch trống...</span>}
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2">
                    {availableSlots.map(slot => {
                        const isBooked = bookedSlots.includes(slot);
                        return (
                            <button
                                key={slot}
                                type="button"
                                disabled={isBooked || !formData.visit_date}
                                onClick={() => handleChange({ target: { name: 'visit_time_start', value: slot } } as any)}
                                className={`
                                                                        btn-raw py-2 px-1 text-sm rounded-md border text-center
                                    ${isBooked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50 relative overflow-hidden' : 
                                      formData.visit_time_start === slot ? 'bg-primary text-white border-primary shadow-md transform scale-[1.02]' : 
                                      'bg-white text-slate-700 hover:border-primary hover:text-primary'
                                    }
                                    ${!formData.visit_date ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {slot}
                                {isBooked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80">
                                        <span className="text-[10px] sm:text-xs font-semibold text-slate-500 rotate-[-15deg]">Kín</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
                {!formData.visit_date && <p className="text-xs text-slate-500 mt-1">Vui lòng chọn ngày trước để xem giờ trống.</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                    <Label htmlFor="number_of_visitors">Số người</Label>
                    <Input required id="number_of_visitors" name="number_of_visitors" type="number" min="1" max="10" value={formData.number_of_visitors} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="purpose">Mục đích</Label>
                    <Input id="purpose" name="purpose" value={formData.purpose} onChange={handleChange} />
                </div>
            </div>

            <div className="flex gap-3 pt-6 w-full">
                {onCancel && (
                    <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                        Hủy
                    </Button>
                )}
                <Button type="submit" className="flex-1 text-white gap-2" disabled={isLoading}>
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin"/>}
                    Xác nhận Đặt lịch
                </Button>
            </div>
        </form>
    );
});
