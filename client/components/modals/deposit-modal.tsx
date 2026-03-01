import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    WalletIcon,
    QrCodeIcon,
    ArrowRightIcon,
    ArrowPathIcon,
    CheckIcon,
    ClipboardDocumentIcon
} from "@heroicons/react/24/outline";
import { authStorage } from "@/services/auth/auth-storage.service";
import { accountBalanceService } from "@/services/account-balance/account-balance.service";
import { useToast } from "@/contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PaymentResponse } from "@/types/payment/payment.type";

interface DepositModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    orgId?: string;
    currentBalance?: number;
}
const STEPS = [
    { id: "AMOUNT", title: "Nhập số tiền" },
    { id: "QR", title: "Thanh toán" },
    { id: "SUCCESS", title: "Hoàn tất" }
];

const QUICK_AMOUNTS = [
    50000, 100000, 200000,
    500000, 1000000, 2000000
];

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const contentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export function DepositModal({ open, onOpenChange, onSuccess, orgId, currentBalance }: DepositModalProps) {
    const { showToast } = useToast();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [transData, setTransData] = useState<any>(null);

    // Reset when opening
    useEffect(() => {
        if (open) {
            setCurrentStepIndex(0);
            setAmount("");
            setLoading(false);
        }
    }, [open]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    const handleAmountSelect = (val: number) => {
        setAmount(val.toString());
    };

    const handleContinue = async () => {
        const value = parseInt(amount.replace(/\D/g, ''));
        if (!value || value < 10000) {
            showToast("Tối thiểu 10.000đ", "error");
            return;
        }

        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                showToast("Vui lòng đăng nhập lại", "error");
                return;
            }
            if (!orgId) {
                showToast("Không tìm thấy thông tin tổ chức", "error");
                return;
            }

            // Call API to create deposit
            const res: PaymentResponse = await accountBalanceService.createDeposit(token, orgId, value, "Nạp tiền vào ví");

            const qrData = {
                ...res,
                // Fallback/Mock data
                bankId: res.bankInfo?.bankName || "MB",
                accountNo: res.bankInfo?.accountNumber || "0000123456789",
                accountName: res.bankInfo?.accountHolder || "FINTRACK SYSTEM",
                content: res.bankInfo?.transferContent || `NAP ${value} ${res.paymentId ? res.paymentId.slice(-6) : 'TX123'}`,
                amount: value
            };

            setTransData(qrData);
            setCurrentStepIndex(1); // Move to QR Step

        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Lỗi tạo giao dịch", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDemoSuccess = () => {
        setCurrentStepIndex(2); // Move to Success Step
        if (onSuccess) onSuccess();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast("Đã sao chép", "success");
    };

    const renderStepContent = () => {
        switch (currentStepIndex) {
            case 0: // AMOUNT
                return (
                    <motion.div variants={fadeInUp} className="space-y-6">
                        <div className="space-y-4">
                            {/* Balance Display */}
                            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border/50">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <WalletIcon className="w-4 h-4" /> Số dư hiện tại
                                </span>
                                <span className="font-bold text-primary">
                                    {formatCurrency(currentBalance || 0)}
                                </span>
                            </div>

                            <div className="relative">
                                <Label className="text-muted-foreground mb-2 block">Số tiền cần nạp</Label>
                                <div className="relative">
                                    <Input
                                        value={amount ? new Intl.NumberFormat('vi-VN').format(parseInt(amount.replace(/\D/g, '') || '0')) : ''}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setAmount(val);
                                        }}
                                        placeholder="0"
                                        className="text-3xl font-bold h-16 text-center border-2 focus-visible:ring-0 focus-visible:border-primary pr-12 pl-12"
                                        autoFocus
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                        VND
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {QUICK_AMOUNTS.map((val) => (
                                    <Button
                                        key={val}
                                        variant="outline"
                                        className={cn(
                                            "h-10 hover:border-primary hover:text-primary transition-all text-xs sm:text-sm",
                                            parseInt(amount.replace(/\D/g, '') || '0') === val && "border-primary text-primary bg-primary/5"
                                        )}
                                        onClick={() => handleAmountSelect(val)}
                                    >
                                        {val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="w-full font-semibold shadow-md"
                            onClick={handleContinue}
                            disabled={loading || parseInt(amount.replace(/\D/g, '') || '0') < 10000}
                        >
                            {loading ? <ArrowPathIcon className="animate-spin mr-2 h-5 w-5" /> : (
                                <span className="flex items-center">
                                    Tiếp tục <ArrowRightIcon className="ml-2 h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </motion.div>
                );
            case 1: // QR
                const qrUrl = `https://img.vietqr.io/image/${transData?.bankId || 'MB'}-${transData?.accountNo || '033333333'}-compact2.png?amount=${transData?.amount}&addInfo=${encodeURIComponent(transData?.content)}&accountName=${encodeURIComponent(transData?.accountName)}`;
                return (
                    <motion.div variants={fadeInUp} className="space-y-6">
                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-dashed shadow-sm">
                            <div className="relative w-48 h-48">
                                <img
                                    src={qrUrl}
                                    alt="VietQR"
                                    className="w-full h-full object-contain mix-blend-multiply"
                                />
                                {/* Corner Accents */}
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-lg" />
                            </div>
                            <p className="text-xs text-green-600 font-medium mt-3 flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full animate-pulse border border-green-100">
                                <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                Đang chờ hệ thống xác nhận...
                            </p>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Ngân hàng</span>
                                <span className="font-medium">{transData?.bankId}</span>
                            </div>
                            <div className="h-px bg-border/50" />
                            <div className="flex justify-between items-center group">
                                <span className="text-muted-foreground">Số tài khoản</span>
                                <div className="flex items-center gap-2 font-mono font-medium">
                                    {transData?.accountNo}
                                    <ClipboardDocumentIcon
                                        className="w-3.5 h-3.5 cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => copyToClipboard(transData?.accountNo)}
                                    />
                                </div>
                            </div>
                            <div className="h-px bg-border/50" />
                            <div className="flex justify-between items-center group">
                                <span className="text-muted-foreground">Nội dung</span>
                                <div className="flex items-center gap-2 font-mono font-medium text-primary">
                                    {transData?.content}
                                    <ClipboardDocumentIcon
                                        className="w-3.5 h-3.5 cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => copyToClipboard(transData?.content)}
                                    />
                                </div>
                            </div>
                            <div className="h-px bg-border/50" />
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Số tiền</span>
                                <span className="font-bold text-base">{formatCurrency(transData?.amount || 0)}</span>
                            </div>
                        </div>

                        <div className="text-center">
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0 hover:bg-transparent hover:underline" onClick={handleDemoSuccess}>
                                (Click để giả lập thành công)
                            </Button>
                        </div>
                    </motion.div>
                );
            case 2: // SUCCESS
                return (
                    <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center py-6 text-center space-y-6">
                        <div className="relative">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600"
                            >
                                <CheckIcon className="h-10 w-10" strokeWidth={3} />
                            </motion.div>
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.2, opacity: 0 }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-0 bg-green-400 rounded-full -z-10 opacity-20"
                            />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-green-600">Thành công!</h3>
                            <p className="text-muted-foreground">
                                Quý khách đã nạp thành công
                            </p>
                            <div className="text-3xl font-bold text-gray-900 tracking-tight">
                                +{formatCurrency(transData?.amount || 0)}
                            </div>
                        </div>

                        <Button
                            onClick={() => onOpenChange(false)}
                            className="w-full bg-green-600 hover:bg-green-700 shadow-md shadow-green-200"
                        >
                            Hoàn tất giao dịch
                        </Button>
                    </motion.div>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-105 p-0 overflow-hidden bg-background border shadow-lg transition-all duration-300">
                <DialogHeader className={cn("p-6 pb-2", currentStepIndex === 2 && "hidden")}>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {currentStepIndex === 0 ? <WalletIcon className="w-5 h-5 text-primary" /> : <QrCodeIcon className="w-5 h-5 text-primary" />}
                        {STEPS[currentStepIndex].title}
                    </DialogTitle>
                    <div className="flex gap-1 mt-4">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary"
                                    initial={{ width: 0 }}
                                    animate={{ width: index <= currentStepIndex ? "100%" : "0%" }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        ))}
                    </div>
                </DialogHeader>

                <div className="p-6 pt-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStepIndex}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={contentVariants}
                        >
                            {renderStepContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
