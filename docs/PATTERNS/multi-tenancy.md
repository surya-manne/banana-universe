# Multi-Tenancy Pattern

Scope requests to a tenant using `@Tenant` + `TenantContext` backed by AsyncLocalStorage.

## When to Use

- SaaS applications serving multiple customers from one deployment
- Any scenario where data must be isolated per tenant at the request level

## Pattern

```typescript
import { 
  Tenant, 
  TenantContext, 
  getTenantId,
  createTenantMiddleware 
} from '@banana-universe/bananajs';

// Option A: Class-level (all methods in controller are tenant-scoped)
@Controller('invoices')
@Tenant()
@injectable()
export class InvoiceController extends BaseController {
  @Get()
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = getTenantId(); // reads from AsyncLocalStorage
      const invoices = await this.invoiceService.findByTenant(tenantId);
      this.ok(res, 'Invoices', invoices);
    } catch (error) {
      return next(error);
    }
  }
}

// Option B: Method-level override
@Get('admin')
@Tenant({ bypass: true })  // opt specific method out
async adminList(...) { ... }
```

```typescript
// Middleware (must mount before routes)
const app = await BananaApp.create(
  defineBananaAppOptions({
    modules: [invoiceModule],
    middlewares: [createTenantMiddleware()],
  })
);
```

## Tenant ID extraction (default priority)

1. `x-tenant-id` request header
2. JWT `tid` claim (if auth middleware is present)

## Rules

- `createTenantMiddleware()` must mount **before** routes
- `getTenantId()` returns `undefined` outside a tenant context — guard before use
- Cache keys are automatically namespaced: `${tenantId}:${originalKey}` when `@Tenant` is active
- Use `runWithTenant(tenantId, fn)` for background jobs or test isolation
