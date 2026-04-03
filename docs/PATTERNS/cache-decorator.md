# Cache Decorator Pattern

Use `@Cache` and `@CacheEvict` to add TTL-based method-level caching without manual cache management.

## When to Use

- Controller methods that return stable, frequently-read data
- Service methods with expensive queries that can tolerate short staleness

## Pattern

```typescript
import { Cache, CacheEvict } from '@banana-universe/bananajs';
import type { Request, Response, NextFunction } from 'express';

@Controller('products')
@injectable()
export class ProductController extends BaseController {

  // Cache for 120 seconds, key based on request
  @Get(':id')
  @Cache({ ttl: 120, key: (req) => `product:${req.params.id}` })
  async getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await this.productService.findById(req.params.id);
      this.ok(res, 'Product found', product);
    } catch (error) {
      return next(error);
    }
  }

  // Evict all keys matching the pattern on mutation
  @Post(':id')
  @CacheEvict({ pattern: 'product:*' })
  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    // ...
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttl` | `number` | `60` | Cache TTL in seconds |
| `key` | `string \| (req) => string` | route path | Cache key or key factory |

| Option | Description |
|--------|-------------|
| `pattern` | Glob pattern for eviction (e.g. `product:*`, `user:**`) |

## Rules

- `CacheManager` is a singleton using `MemoryCacheStore` by default; supply a custom `CacheStore` for Redis
- Multi-tenancy: cache keys are auto-namespaced per tenant when `@Tenant` is active
