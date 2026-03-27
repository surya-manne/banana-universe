# Multi-Tenancy Guide

How to build multi-tenant applications with BananaJS. Covers tenant identification, tenant-scoped caching, and per-tenant database patterns using the TypeORM and Mongoose plugins.

---

## Quick Start

```typescript
import BananaApp from '@banana-universe/bananajs'
import { Controller, Get, Tenant, getTenantId } from '@banana-universe/bananajs'
import type { Request, Response } from 'express'

@Controller('/users')
@Tenant() // extract tenantId from JWT 'tid' claim or 'x-tenant-id' header
export class UserController {
  @Get('/')
  async list(_req: Request, res: Response): Promise<void> {
    const tenantId = getTenantId()
    // Filter data by tenantId
    res.json({ tenantId, users: [] })
  }
}

const app = await BananaApp.create([UserController], {
  cache: { store: 'memory' }, // cache keys auto-namespaced per tenant
})
```

---

## Tenant Identification

`@Tenant()` supports two identification strategies (tried in order):

1. **`x-tenant-id` header** — direct tenant ID header (useful for service-to-service)
2. **JWT `tid` claim** — extracted from the `Authorization: Bearer <token>` header; decoded without verification (auth layer handles verification)

Custom field names:

```typescript
@Tenant({ header: 'x-org-id', jwtClaim: 'org' })
@Controller('/resources')
export class ResourceController {}
```

---

## Accessing Tenant ID

```typescript
import { getTenantId, runWithTenant } from '@banana-universe/bananajs'

// Inside a route handler or service (requires @Tenant on the route)
const tenantId = getTenantId() // string | undefined

// Run code in a specific tenant context (useful for background jobs)
runWithTenant('tenant-123', () => {
  // getTenantId() returns 'tenant-123' here
})
```

---

## Tenant-Scoped Caching

When `@Tenant` is active, `@Cache` key generation automatically prefixes keys with `tenant:{tenantId}:`. No changes needed:

```typescript
@Controller('/products')
@Tenant()
export class ProductController {
  @Cache({ ttl: 300 })
  @Get('/')
  async list() {
    /* cached per-tenant automatically */
  }
}
```

Cache key format: `tenant:acme:ProductController:list:{}:{}`

---

## Per-Tenant Database Patterns

### TypeORM: Tenant Schema Isolation

```typescript
import { TypeOrmPlugin } from '@banana-universe/plugin-typeorm'
import { getTenantId } from '@banana-universe/bananajs'

// Option A: Schema per tenant (PostgreSQL)
// Each tenant has their own schema: public, tenant_acme, tenant_corp, etc.
const app = await BananaApp.create([UserController], {
  plugins: [
    new TypeOrmPlugin({
      type: 'postgres',
      schema: getTenantId() ?? 'public', // set dynamically per request
      // ...
    }),
  ],
})

// Option B: Row-level security (recommended for most cases)
// Add a tenantId column to all tables and filter in queries
@Entity()
export class User {
  @Column()
  tenantId!: string
  // ...
}

// In service:
const users = await repo.find({ where: { tenantId: getTenantId() } })
```

### Mongoose: Tenant Filtering

```typescript
import { getTenantId } from '@banana-universe/bananajs'

// Row-level filtering — add tenant to Mongoose queries, same idea as SQL:
// await articleModel.find({ tenantId: getTenantId() })
```

### Per-Tenant Connection Pooling

For strict data isolation, each tenant can have its own database connection. This requires managing a `Map<tenantId, DataSource>` and selecting the right connection per request:

```typescript
// Custom connection pool manager
class TenantConnectionManager {
  private pools = new Map<string, DataSource>()

  async getConnection(tenantId: string): Promise<DataSource> {
    if (!this.pools.has(tenantId)) {
      const ds = new DataSource({
        type: 'postgres',
        database: `tenant_${tenantId}`,
        // ... per-tenant config
      })
      await ds.initialize()
      this.pools.set(tenantId, ds)
    }
    return this.pools.get(tenantId)!
  }
}

// Use in a service via DI
@Injectable()
export class UserService {
  constructor(private readonly tenantManager: TenantConnectionManager) {}

  async listUsers() {
    const tenantId = getTenantId()
    if (!tenantId) throw new Error('No tenant context')
    const ds = await this.tenantManager.getConnection(tenantId)
    return ds.getRepository(User).find()
  }
}
```

---

## Security Considerations

- Always authenticate before tenant extraction (`@Auth()` + `@Tenant()` on the class)
- Never trust `x-tenant-id` header from untrusted clients without validation
- For JWT-based tenancy, ensure JWT signature verification is in your `AuthGuard`
- Use row-level security in the database as a defense-in-depth measure
