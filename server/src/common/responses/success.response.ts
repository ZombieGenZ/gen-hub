/**
 * Response Base Classes
 * Các class response chuẩn hóa cho toàn bộ API trong dự án
 */

/**
 * Interface cơ bản cho tất cả response
 */
export interface IBaseResponse<T> {
  /** Mã code để client xác định xử lý (format: module.action, ví dụ: login.success) */
  code: string;
  /** Thông báo */
  message: string;
  /** Trạng thái thành công */
  success: boolean;
  /** Dữ liệu trả về */
  data?: T;
  /** Thông tin xác thực (tokens) */
  authorization?: Record<string, unknown>;
}

/**
 * Class response cơ bản cho các request thành công
 */
export class SuccessResponse<T> implements IBaseResponse<T> {
  code: string;
  message: string;
  success: boolean;
  data?: T;
  authorization?: Record<string, unknown>;

  constructor(
    code: string,
    data?: T,
    message = 'Thao tác thành công',
    authorization?: Record<string, unknown>,
  ) {
    this.code = code;
    this.message = message;
    this.success = true;
    this.data = data;
    this.authorization = authorization;
  }

  /**
   * Custom JSON serialization - loại bỏ các trường null/undefined
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      code: this.code,
      message: this.message,
      success: this.success,
    };

    if (this.data !== undefined && this.data !== null) {
      result.data = this.data;
    }

    if (this.authorization !== undefined && this.authorization !== null) {
      result.authorization = this.authorization;
    }

    return result;
  }
}

/**
 * Response cho các request tạo mới tài nguyên (HTTP 201)
 */
export class CreatedResponse<T> extends SuccessResponse<T> {
  constructor(
    code: string,
    data?: T,
    message = 'Tạo mới thành công',
    authorization?: Record<string, unknown>,
  ) {
    super(code, data, message, authorization);
  }
}

/**
 * Response cho các request cập nhật tài nguyên (HTTP 200)
 */
export class UpdatedResponse<T> extends SuccessResponse<T> {
  constructor(
    code: string,
    data?: T,
    message = 'Cập nhật thành công',
    authorization?: Record<string, unknown>,
  ) {
    super(code, data, message, authorization);
  }
}

/**
 * Response cho các request lấy dữ liệu (HTTP 200)
 */
export class GetResponse<T> extends SuccessResponse<T> {
  constructor(
    code: string,
    data?: T,
    message = 'Lấy dữ liệu thành công',
    authorization?: Record<string, unknown>,
  ) {
    super(code, data, message, authorization);
  }
}

/**
 * Response cho các request xóa tài nguyên (HTTP 200)
 */
export class DeletedResponse<T> extends SuccessResponse<T> {
  constructor(
    code: string,
    data?: T,
    message = 'Xóa thành công',
    authorization?: Record<string, unknown>,
  ) {
    super(code, data, message, authorization);
  }
}

/**
 * Response OK chung (HTTP 200)
 */
export class OkResponse<T> extends SuccessResponse<T> {
  constructor(
    code: string,
    data?: T,
    message = 'OK',
    authorization?: Record<string, unknown>,
  ) {
    super(code, data, message, authorization);
  }
}
