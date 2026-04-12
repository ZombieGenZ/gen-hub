type SwaggerSchema = Record<string, unknown>;

interface SuccessSchemaOptions {
  code: string;
  message: string;
  dataSchema?: SwaggerSchema;
  dataExample?: unknown;
}

interface ErrorSchemaOptions {
  code: string;
  message: string;
  errors?: unknown;
}

export function buildSuccessResponseSchema(
  options: SuccessSchemaOptions,
): SwaggerSchema {
  const schema: SwaggerSchema = {
    type: 'object',
    properties: {
      code: { type: 'string', example: options.code },
      message: { type: 'string', example: options.message },
      success: { type: 'boolean', example: true },
    },
    example: {
      code: options.code,
      message: options.message,
      success: true,
    },
  };

  if (options.dataSchema) {
    (schema.properties as Record<string, unknown>).data = options.dataSchema;
  }

  if (options.dataExample !== undefined) {
    (schema.example as Record<string, unknown>).data = options.dataExample;
  }

  return schema;
}

export function buildErrorResponseSchema(
  options: ErrorSchemaOptions,
): SwaggerSchema {
  const schema: SwaggerSchema = {
    type: 'object',
    properties: {
      code: { type: 'string', example: options.code },
      message: { type: 'string', example: options.message },
      success: { type: 'boolean', example: false },
    },
    example: {
      code: options.code,
      message: options.message,
      success: false,
    },
  };

  if (options.errors !== undefined) {
    (schema.properties as Record<string, unknown>).errors = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string', example: 'field_name' },
          message: { type: 'string', example: 'Thông tin không hợp lệ' },
        },
      },
    };
    (schema.example as Record<string, unknown>).errors = options.errors;
  }

  return schema;
}

export function buildPaginationDataSchema(
  itemSchema: SwaggerSchema,
): SwaggerSchema {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: itemSchema,
      },
      total: { type: 'number', example: 12 },
      limit: { type: 'number', example: 10 },
      offset: { type: 'number', example: 0 },
      hasMore: { type: 'boolean', example: true },
    },
  };
}

export function buildUuidSchema(
  description: string,
  example: string,
): SwaggerSchema {
  return {
    type: 'string',
    format: 'uuid',
    description,
    example,
  };
}
