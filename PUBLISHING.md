# Publishing to NPM

This repository uses Nx Release for automatic, independent versioning based on conventional commits. Only packages with actual code changes will be versioned and published.

## 1. Login to NPM
Ensure you are authenticated locally. Do not commit `.npmrc` files.
```bash
npm login
```

## 2. Verify Code
Make sure all packages build and type-check.
```bash
npx nx run-many --target=build --all
npx nx run-many --target=typecheck --all
```

## 3. Preview Release (Optional)
Check which packages will be bumped and published, and what their changelogs will contain (no changes are made).
```bash
npm run release:dry-run
```

## 4. Publish
Bump versions, update changelogs, create git tags, and immediately publish updated packages to NPM.
```bash
npm run release:full
```

---

### Need 2-step manual control?
If you prefer to separate the versioning (commits/tags) from the actual npm upload:
1. `npm run release:version` (Generates version bumps + changelogs + git tags)
2. `npm run release:publish` (Uploads those newly tagged artifacts to npm)
