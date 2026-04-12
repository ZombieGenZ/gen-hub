/**
 * Notification Service interfaces
 */

/**
 * Interface cho thông tin email
 */
export interface IEmailOptions {
  /** Địa chỉ email người nhận */
  to: string;
  /** Tiêu đề email */
  subject: string;
  /** Nội dung text */
  text?: string;
  /** Nội dung HTML */
  html?: string;
}
