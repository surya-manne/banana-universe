export enum MetadataKeys {
  BASE_PATH = 'base_path',
  ROUTERS = 'routers',
  // Phase 2 — Auth
  AUTH = 'banana:auth',
  ROLES = 'banana:roles',
  PUBLIC = 'banana:public',
  // Phase 2 — Rate Limiting
  RATE_LIMIT = 'banana:rate_limit',
  // Phase 2 — File Upload
  UPLOAD = 'banana:upload',
  // Phase 2 — OpenAPI
  API_TAGS = 'banana:api_tags',
  API_OPERATION = 'banana:api_operation',
  API_BODY = 'banana:api_body',
  API_RESPONSE = 'banana:api_response',
  // Phase 3 — Caching
  CACHE = 'banana:cache',
  CACHE_EVICT = 'banana:cache_evict',
  // Phase 3 — ORM (used by plugin packages)
  TRANSACTIONAL = 'banana:transactional',
  INJECT_REPOSITORY = 'banana:inject_repository',
  // Phase 4 — Security
  SANITIZE = 'banana:sanitize',
  CAN = 'banana:can',
  THROTTLE = 'banana:throttle',
  API_SECURITY = 'banana:api_security',
  // Phase 4 — Multi-Tenancy
  TENANT = 'banana:tenant',
}
