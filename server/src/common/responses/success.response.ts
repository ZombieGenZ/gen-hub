/**
 * Response Base Classes
 * Các class response chuẩn hóa cho toàn bộ API trong dự án
 */

/**
 * Interface cơ bản cho tất cả response
 */
export interface IBaseResponse<T> {
  /** Mã trạng thái HTTP */
  statusCode: number;
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
  statusCode: number;
  message: string;
  success: boolean;
  data?: T;
  authorization?: Record<string, unknown>;

  constructor(
    data?: T,
    message = 'Thao tác thành công',
    statusCode = 200,
    authorization?: Record<string, unknown>,
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.success = true;
    this.data = data;
    this.authorization = authorization;
  }
}


/**
 * Response cho các request tạo mới tài nguyên (HTTP 201)
 */
export class CreatedResponse<T> extends SuccessResponse<T> {
  constructor(
    data?: T,
    message = 'Tạo mới thành công',
    authorization?: Record<string, unknown>,
  ) {
    super(data, message, 201, authorization);
  }
}

/**
 * Response cho các request cập nhật tài nguyên (HTTP 200)
 */
export class UpdatedResponse<T> extends SuccessResponse<T> {
  constructor(
    data?: T,
    message = 'Cập nhật thành công',
    authorization?: Record<string, unknown>,
  ) {
    super(data, message, 200, authorization);
  }
}

/**
 * Response cho các request lấy dữ liệu (HTTP 200)
 */
export class GetResponse<T> extends SuccessResponse<T> {
  constructor(
    data?: T,
    message = 'Lấy dữ liệu thành công',
    authorization?: Record<string, unknown>,
  ) {
    super(data, message, 200, authorization);
  }
}

/**
 * Response cho các request xóa tài nguyên (HTTP 200)
 */
export class DeletedResponse<T> extends SuccessResponse<T> {
  constructor(
    data?: T,
    message = 'Xóa thành công',
    authorization?: Record<string, unknown>,
  ) {
    super(data, message, 200, authorization);
  }
}

/**
 * Response OK chung (HTTP 200)
 */
export class OkResponse<T> extends SuccessResponse<T> {
  constructor(
    data?: T,
    message = 'OK',
    authorization?: Record<string, unknown>,
  ) {
    super(data, message, 200, authorization);
  }
}
