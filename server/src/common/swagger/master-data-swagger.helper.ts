type SwaggerSchema = Record<string, any>;

interface SuccessSchemaOptions {
  code: string;
  message: string;
  dataSchema: SwaggerSchema;
  dataExample: unknown;
}

interface ErrorSchemaOptions {
  code: string;
  message: string;
  errorsExample?: Array<{ field: string; message: string }>;
}

export function buildSuccessSchema(options: SuccessSchemaOptions): SwaggerSchema {
  return {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'Mã kết quả để client xử lý nghiệp vụ',
        example: options.code,
      },
      message: {
        type: 'string',
        description: 'Thông điệp mô tả kết quả xử lý',
        example: options.message,
      },
      success: {
        type: 'boolean',
        description: 'Trạng thái xử lý thành công',
        example: true,
      },
      data: options.dataSchema,
    },
    example: {
      code: options.code,
      message: options.message,
      success: true,
      data: options.dataExample,
    },
  };
}

export function buildPaginatedSchema(itemSchema: SwaggerSchema): SwaggerSchema {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Danh sách bản ghi trong trang hiện tại',
        items: itemSchema,
      },
      total: {
        type: 'number',
        description: 'Tổng số bản ghi phù hợp điều kiện lọc',
        example: 25,
      },
      limit: {
        type: 'number',
        description: 'Số lượng bản ghi tối đa trên mỗi trang',
        example: 10,
      },
      offset: {
        type: 'number',
        description: 'Vị trí bắt đầu của trang hiện tại',
        example: 0,
      },
      hasMore: {
        type: 'boolean',
        description: 'Cho biết còn dữ liệu để tải thêm hay không',
        example: true,
      },
    },
  };
}

export function buildErrorSchema(options: ErrorSchemaOptions): SwaggerSchema {
  const schema: SwaggerSchema = {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'Mã lỗi nghiệp vụ',
        example: options.code,
      },
      message: {
        type: 'string',
        description: 'Thông điệp lỗi',
        example: options.message,
      },
      success: {
        type: 'boolean',
        description: 'Trạng thái xử lý thất bại',
        example: false,
      },
    },
    example: {
      code: options.code,
      message: options.message,
      success: false,
    },
  };

  if (options.errorsExample?.length) {
    schema.properties.errors = {
      type: 'array',
      description: 'Danh sách lỗi chi tiết theo từng trường',
      items: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            example: options.errorsExample[0].field,
          },
          message: {
            type: 'string',
            example: options.errorsExample[0].message,
          },
        },
      },
    };
    schema.example.errors = options.errorsExample;
  }

  return schema;
}
