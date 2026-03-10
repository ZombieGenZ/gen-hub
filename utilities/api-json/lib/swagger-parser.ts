import type {
  ApiEndpoint,
  ExtractedSwaggerJson,
  HttpMethod,
  SwaggerComponents,
  SwaggerPathItem,
  SwaggerReference,
  SwaggerSpec,
  TagGroup,
} from "@/types/swagger";

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "delete", "patch", "options", "head"];

export async function fetchSwaggerSpec(swaggerUrl: string): Promise<SwaggerSpec> {
  const response = await fetch(`/api/swagger?url=${encodeURIComponent(swaggerUrl)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await safeParseJson(response)) as { message?: string } | null;
    throw new Error(payload?.message || "Không thể tải Swagger JSON.");
  }

  return (await response.json()) as SwaggerSpec;
}

export function parseEndpoints(spec: SwaggerSpec): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }

      endpoints.push({
        id: createEndpointKey(method, path),
        method,
        path,
        summary: operation.summary || operation.description || "Không có mô tả",
        description: operation.description,
        tags: operation.tags?.length ? operation.tags : ["Untagged"],
        operationId: operation.operationId,
        operation,
      });
    }
  }

  return endpoints.sort((left, right) => {
    const leftTag = left.tags[0] ?? "Untagged";
    const rightTag = right.tags[0] ?? "Untagged";

    if (leftTag !== rightTag) {
      return leftTag.localeCompare(rightTag, "vi");
    }

    if (left.path !== right.path) {
      return left.path.localeCompare(right.path, "vi");
    }

    return HTTP_METHODS.indexOf(left.method) - HTTP_METHODS.indexOf(right.method);
  });
}

export function groupByTags(endpoints: ApiEndpoint[], spec?: SwaggerSpec): TagGroup[] {
  const tagOrder = new Map<string, number>();
  const tagDescriptions = new Map<string, string | undefined>();

  spec?.tags?.forEach((tag, index) => {
    tagOrder.set(tag.name, index);
    tagDescriptions.set(tag.name, tag.description);
  });

  const groups = new Map<string, ApiEndpoint[]>();

  for (const endpoint of endpoints) {
    for (const tag of endpoint.tags) {
      const bucket = groups.get(tag) ?? [];
      bucket.push(endpoint);
      groups.set(tag, bucket);
    }
  }

  return Array.from(groups.entries())
    .map(([tag, groupedEndpoints]) => ({
      tag,
      description: tagDescriptions.get(tag),
      endpoints: groupedEndpoints.sort((left, right) => {
        if (left.path !== right.path) {
          return left.path.localeCompare(right.path, "vi");
        }
        return HTTP_METHODS.indexOf(left.method) - HTTP_METHODS.indexOf(right.method);
      }),
    }))
    .sort((left, right) => {
      const leftOrder = tagOrder.get(left.tag) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = tagOrder.get(right.tag) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.tag.localeCompare(right.tag, "vi");
    });
}

export function extractSelectedJson(
  spec: SwaggerSpec,
  selectedEndpoints: ApiEndpoint[],
): ExtractedSwaggerJson {
  const paths: Record<string, SwaggerPathItem> = {};
  const refsToResolve = new Set<string>();

  for (const endpoint of selectedEndpoints) {
    const originalPathItem = spec.paths[endpoint.path];
    if (!originalPathItem) {
      continue;
    }

    const nextPathItem = paths[endpoint.path] ?? {};
    const operation = originalPathItem[endpoint.method];

    if (originalPathItem.parameters) {
      nextPathItem.parameters = deepClone(originalPathItem.parameters);
      collectRefs(originalPathItem.parameters, refsToResolve);
    }

    if (operation) {
      nextPathItem[endpoint.method] = deepClone(operation);
      collectRefs(operation, refsToResolve);
    }

    paths[endpoint.path] = nextPathItem;
  }

  const components = resolveReferencedComponents(spec, refsToResolve);
  const selectedTags = collectSelectedTags(spec, selectedEndpoints);

  return {
    openapi: spec.openapi,
    info: spec.info ? deepClone(spec.info) : undefined,
    servers: spec.servers ? deepClone(spec.servers) : undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    paths,
    components: hasComponents(components) ? components : undefined,
  };
}

export function createEndpointKey(method: HttpMethod, path: string) {
  return `${method}:${path}`;
}

function resolveReferencedComponents(
  spec: SwaggerSpec,
  refsToResolve: Set<string>,
): SwaggerComponents {
  const components: SwaggerComponents = {};
  const processed = new Set<string>();

  for (const ref of refsToResolve) {
    includeReference(spec, ref, processed, components);
  }

  return components;
}

function includeReference(
  spec: SwaggerSpec,
  ref: string,
  processed: Set<string>,
  target: SwaggerComponents,
) {
  if (processed.has(ref)) {
    return;
  }

  processed.add(ref);

  const parts = ref.replace(/^#\//, "").split("/");
  if (parts.length < 3 || parts[0] !== "components") {
    return;
  }

  const [, componentType, ...rest] = parts;
  const componentName = rest.join("/");
  const sourceBucket = spec.components?.[componentType as keyof SwaggerComponents] as
    | Record<string, unknown>
    | undefined;

  if (!sourceBucket || !(componentName in sourceBucket)) {
    return;
  }

  const targetBucket = (target[componentType as keyof SwaggerComponents] ??=
    {}) as Record<string, unknown>;

  if (componentName in targetBucket) {
    return;
  }

  const clonedValue = deepClone(sourceBucket[componentName]);
  targetBucket[componentName] = clonedValue;

  const nestedRefs = new Set<string>();
  collectRefs(clonedValue, nestedRefs);
  for (const nestedRef of nestedRefs) {
    includeReference(spec, nestedRef, processed, target);
  }
}

function collectSelectedTags(spec: SwaggerSpec, selectedEndpoints: ApiEndpoint[]) {
  const tagNames = new Set(selectedEndpoints.flatMap((endpoint) => endpoint.tags));

  if (!spec.tags?.length) {
    return Array.from(tagNames).map((name) => ({ name }));
  }

  const ordered = spec.tags.filter((tag) => tagNames.has(tag.name)).map((tag) => deepClone(tag));
  const existingNames = new Set(ordered.map((tag) => tag.name));

  for (const name of tagNames) {
    if (!existingNames.has(name)) {
      ordered.push({ name });
    }
  }

  return ordered;
}

function collectRefs(value: unknown, refs: Set<string>) {
  walkRefs(value, refs);
}

function walkRefs(value: unknown, refs: Set<string>) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => walkRefs(item, refs));
    return;
  }

  if (isReference(value)) {
    refs.add(value.$ref);
  }

  for (const nestedValue of Object.values(value)) {
    walkRefs(nestedValue, refs);
  }
}

function hasComponents(components: SwaggerComponents) {
  return Object.values(components).some((value) => value && Object.keys(value).length > 0);
}

function isReference(value: unknown): value is SwaggerReference {
  return typeof value === "object" && value !== null && "$ref" in value;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
