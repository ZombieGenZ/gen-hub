/**
 * Interfaces cho SePay payment
 */

// Webhook data từ SePay
export interface ISepayWebhookData {
  id: number; // ID giao dịch trên SePay
  gateway: string; // Brand name ngân hàng
  transactionDate: string; // Thời gian giao dịch
  accountNumber: string; // Số tài khoản ngân hàng
  subAccount?: string; // Tài khoản định danh
  code?: string; // Mã code thanh toán (SePay tự nhận diện)
  content: string; // Nội dung chuyển khoản
  transferType: 'in' | 'out'; // Loại giao dịch
  transferAmount: number; // Số tiền giao dịch
  accumulated: number; // Số dư tài khoản
  referenceCode: string; // Mã tham chiếu
  description: string; // Toàn bộ nội dung tin nhắn
}

// Response khi tạo payment trong hệ thống
export interface IPaymentResult {
  paymentId: string;
  paymentCode: string;
  amount: number;
  vat_amount: number;
  qrCode: string; // URL QR từ qr.sepay.vn
  status: string;
  expiredAt: Date;
  // Thông tin chuyển khoản thủ công
  bankInfo: {
    accountNumber: string; // Số tài khoản
    bankName: string; // Tên ngân hàng
    accountHolder: string; // Tên chủ tài khoản
    transferContent: string; // Nội dung chuyển khoản (= paymentCode)
  };
}

// Options tạo contract payment
export interface ICreatePaymentOptions {
  rentalContractId: string;
  amount: number;
  vat_amount: number;
  description: string;
  type: 'NEW_CONTRACT' | 'RENEWAL';
  userId: string;
}
