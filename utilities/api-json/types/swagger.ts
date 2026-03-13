export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head";

export interface SwaggerTag {
  name: string;
  description?: string;
}

export interface SwaggerReference {
  $ref: string;
}

export interface SwaggerSchema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  enum?: Array<string | number>;
  default?: unknown;
  nullable?: boolean;
  required?: string[];
  properties?: Record<string, SwaggerSchema | SwaggerReference>;
  items?: SwaggerSchema | SwaggerReference;
  allOf?: Array<SwaggerSchema | SwaggerReference>;
  anyOf?: Array<SwaggerSchema | SwaggerReference>;
  oneOf?: Array<SwaggerSchema | SwaggerReference>;
  additionalProperties?: boolean | SwaggerSchema | SwaggerReference;
  example?: unknown;
}

export interface SwaggerMediaType {
  schema?: SwaggerSchema | SwaggerReference;
  examples?: Record<string, unknown>;
  example?: unknown;
}

export interface SwaggerParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema?: SwaggerSchema | SwaggerReference;
  example?: unknown;
}

export interface SwaggerRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, SwaggerMediaType>;
}

export interface SwaggerResponse {
  description?: string;
  content?: Record<string, SwaggerMediaType>;
}

export interface SwaggerOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Array<SwaggerParameter | SwaggerReference>;
  requestBody?: SwaggerRequestBody | SwaggerReference;
  responses?: Record<string, SwaggerResponse | SwaggerReference>;
  security?: Array<Record<string, string[]>>;
}

export type SwaggerPathItem = Partial<Record<HttpMethod, SwaggerOperation>> & {
  parameters?: Array<SwaggerParameter | SwaggerReference>;
};

export interface SwaggerComponents {
  schemas?: Record<string, SwaggerSchema>;
  parameters?: Record<string, SwaggerParameter>;
  requestBodies?: Record<string, SwaggerRequestBody>;
  responses?: Record<string, SwaggerResponse>;
}

export interface SwaggerSpec {
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  tags?: SwaggerTag[];
  paths: Record<string, SwaggerPathItem>;
  components?: SwaggerComponents;
}

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  operationId?: string;
  hasMissingActualResponseAlert: boolean;
  operation: SwaggerOperation;
}

export interface TagGroup {
  tag: string;
  description?: string;
  endpoints: ApiEndpoint[];
}

export interface ExtractedSwaggerJson {
  openapi?: string;
  info?: SwaggerSpec["info"];
  servers?: SwaggerSpec["servers"];
  tags?: SwaggerTag[];
  paths: Record<string, SwaggerPathItem>;
  components?: SwaggerComponents;
}
