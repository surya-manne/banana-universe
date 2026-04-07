import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// Versioning strategy note: a docs version dropdown (tied to git tags) can be added when
// multi-package doc versioning needs coordinating (e.g. vitepress-plugin-versions).

/** Handwritten reference pages + TypeDoc — shared by `/reference/*` and `/api/*` sidebars. */
const referenceApiSidebar = [
  {
    text: 'Framework reference',
    items: [
      { text: 'Decorators', link: '/reference/decorators' },
      { text: 'BananaAppOptions', link: '/reference/bananaapp-options' },
      { text: 'Error Types', link: '/reference/error-types' },
      { text: 'Config Module', link: '/reference/config-module' },
    ],
  },
  {
    text: 'Features',
    items: [
      { text: 'OpenAPI / Swagger', link: '/reference/openapi' },
      { text: 'Testing', link: '/reference/testing' },
      { text: 'Caching', link: '/reference/caching' },
      { text: 'Security', link: '/reference/security' },
      { text: 'Multi-tenancy', link: '/reference/multi-tenancy' },
    ],
  },
  {
    text: 'TypeDoc API',
    items: [{ text: 'Browse generated API', link: '/api/' }],
  },
]

export default withMermaid(
  defineConfig({
    title: 'BananaJS',
    description:
      'AI-first, DDD-ready Node.js framework on Express—exceptional DX, pluggable plugins, OpenAPI, and a CLI built for automation.',

    // Rosetta-inspired palette: dark navy + gold (see .vitepress/theme/custom.css)
    appearance: 'force-dark',

    // GitHub Pages deployment base
    base: '/banana-universe/',

    head: [
      [
        'link',
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/banana-universe/favicon.svg',
        },
      ],
    ],

    themeConfig: {
      logo: '/logo.svg',

      nav: [
        { text: 'Guide', link: '/guide/quickstart', activeMatch: '/guide/' },
        { text: 'Philosophy', link: '/guide/philosophy' },
        {
          text: 'AI',
          link: '/ai/',
          activeMatch: '^/(ai/|tooling/(ai-commands|ai-module-generation))',
        },
        { text: 'Recipes', link: '/recipes/', activeMatch: '/recipes/' },
        {
          text: 'Reference',
          link: '/reference/decorators',
          activeMatch: '^/(reference|api)(/|$)',
        },
        { text: 'Integrations', link: '/integrations/typeorm', activeMatch: '/integrations/' },
        { text: 'Plugins', link: '/plugins/overview', activeMatch: '/plugins/' },
        { text: 'Tooling', link: '/tooling/cli', activeMatch: '/tooling/' },
        { text: 'MCP', link: '/mcp/', activeMatch: '/mcp/' },
      ],

      sidebar: {
        '/guide/': [
          {
            text: 'Getting Started',
            items: [
              { text: '5-min Quickstart', link: '/guide/quickstart' },
              { text: 'Full Setup & CLI', link: '/guide/getting-started' },
              { text: 'Philosophy', link: '/guide/philosophy' },
            ],
          },
          {
            text: 'Learning',
            items: [
              { text: 'Core Concepts', link: '/guide/basic-concepts' },
              { text: 'Advanced Concepts', link: '/guide/advanced-concepts' },
            ],
          },
          {
            text: 'Architecture',
            items: [
              {
                text: 'Dependency Injection',
                link: '/guide/dependency-injection',
              },
              {
                text: 'Layered Architecture & DDD',
                link: '/guide/layered-architecture',
              },
              {
                text: 'Domain & Persistence',
                link: '/guide/domain-and-persistence',
              },
            ],
          },
          {
            text: 'Migration',
            items: [{ text: 'From Express', link: '/migration/from-express' }],
          },
        ],

        '/reference/': referenceApiSidebar,
        '/api/': referenceApiSidebar,

        '/integrations/': [
          {
            text: 'Integrations',
            items: [
              { text: 'TypeORM', link: '/integrations/typeorm' },
              { text: 'Mongoose', link: '/integrations/mongoose' },
              { text: 'Authentication', link: '/integrations/auth' },
              { text: 'OpenTelemetry', link: '/integrations/opentelemetry' },
              { text: 'Zod', link: '/integrations/zod' },
            ],
          },
        ],

        '/plugins/': [
          {
            text: 'Plugins',
            items: [
              { text: 'Overview', link: '/plugins/overview' },
              { text: 'WebSocket', link: '/plugins/websocket' },
              { text: 'Writing a Plugin', link: '/plugins/writing-a-plugin' },
            ],
          },
        ],

        '/tooling/': [
          {
            text: 'CLI & Tooling',
            items: [
              { text: 'CLI Reference', link: '/tooling/cli' },
              { text: 'AI Commands', link: '/tooling/ai-commands' },
              { text: 'AI module generation', link: '/tooling/ai-module-generation' },
              { text: 'Benchmarks', link: '/tooling/benchmarks' },
            ],
          },
        ],

        '/ai/': [
          {
            text: 'AI',
            items: [{ text: 'Overview', link: '/ai/' }],
          },
          {
            text: 'Reference in Tooling',
            items: [
              {
                text: 'AI commands — flags & examples',
                link: '/tooling/ai-commands',
              },
              {
                text: 'AI module generation — DDD flow',
                link: '/tooling/ai-module-generation',
              },
              {
                text: 'CLI reference — `bjs ai`',
                link: '/tooling/cli#bjs-ai',
              },
            ],
          },
        ],

        '/recipes/': [
          {
            text: 'Recipes',
            items: [
              { text: 'Overview', link: '/recipes/' },
              { text: 'How to pick a recipe', link: '/recipes/#how-to-pick-a-recipe' },
              { text: 'Soft architecture', link: '/recipes/#soft-architecture-what-stays-stable' },
              { text: 'Conventions', link: '/recipes/#conventions-shared-across-recipes' },
              { text: 'Catalog', link: '/recipes/#catalog' },
            ],
          },
        ],

        '/mcp/': [
          {
            text: 'MCP Server',
            items: [
              { text: 'Overview', link: '/mcp/' },
              { text: 'Exposed tools', link: '/mcp/#exposed-tools' },
              { text: 'Setup per IDE', link: '/mcp/#setup-per-ide' },
              { text: 'Use cases', link: '/mcp/#use-cases' },
              { text: 'Security model', link: '/mcp/#security-model' },
            ],
          },
        ],
      },

      socialLinks: [{ icon: 'github', link: 'https://github.com/surya-manne/banana-universe' }],

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2026',
      },

      editLink: {
        pattern: 'https://github.com/surya-manne/banana-universe/edit/main/docs-site/:path',
        text: 'Edit this page on GitHub',
      },

      search: {
        provider: 'local',
      },
    },

    // Mermaid: Rosetta palette — navy surfaces, gold nodes, cool-gray edges
    mermaid: {
      theme: 'base',
      themeVariables: {
        primaryColor: '#fdb913',
        primaryTextColor: '#0a1628',
        primaryBorderColor: '#e6a010',
        secondaryColor: '#132a45',
        tertiaryColor: '#0a1628',
        lineColor: '#5b7a8c',
        textColor: '#a0a9b8',
        mainBkg: '#0f2440',
        nodeBorder: '#fdb913',
        clusterBkg: '#132a45',
        clusterBorder: 'rgba(253, 185, 19, 0.35)',
        titleColor: '#f8fafc',
        edgeLabelBackground: '#0a1628',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      },
    },
  }),
)
