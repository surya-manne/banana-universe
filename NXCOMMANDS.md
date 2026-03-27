### Creating new react lib

`npx nx g @nx/react:lib lib-name --importPath=@group_name/lib-name`

### Renaming existing lib

`npx nx g @nx/workspace:move --project old-library-name --destination new-library-name --importPath=@legosuite/new-library-name`

### Removing existing app/lib

`npx nx g @nx/workspace:remove --project=library_or_app_name`

### Generate stories in banana-ui-react

`npx nx g @nx/react:stories --project=<project-name>`

### Generate JS lib

`npx nx g @nx/js:lib lib_name --bundler=vite --importPath=@group_name/lib-name --publishable`

## Generate Node lib

`npx nx g @nx/node:lib lib_name --importPath=@group_name/lib_name --publishable`

### Create NX Workspace

`npx create-nx-workspace@latest`

- Select Integrated monorepo option

### Create React App

- yarn add -D @nx/react

`npx nx g @nx/react:app app_name`

- styled-components (style system)
- react-router (navigation)
- vite (bundler)

### Create Next App

- yarn add -D @nx/next

`npx nx g @nx/next:app web --verbose --e2eTestRunner none --unitTestRunner none`

- styled-components (style system)
- App Router (yes)
- `src/` directory (yes)

### Create React Component Library

`npx nx g @nx/react:lib react-components --importPath=@template-frameworks/react-components --publishable`

- vitest (test runner)
- vite (bundler)

### Create React Component inside Library

`npx nx g @nx/react:component Button --project react-components`

- ✔ Should this component be exported in the project? (y/N) · true

to get rid of black command prompts
npx nx clear-cache
