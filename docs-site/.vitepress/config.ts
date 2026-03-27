import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// Versioning strategy note:
// Version dropdown (tied to git tags, e.g. v0.4, v0.5) is deferred until after Phase 6 ships,
// when the second publishable package (@banana-universe/ddd) exists and versioning across
// multiple packages needs coordinating. Implement with vitepress-plugin-versions post-Phase 6.

export default withMermaid(
  defineConfig({
    title: 'BananaJS',
    description:
      'AI-first, DDD-ready Node.js framework on Express—exceptional DX, pluggable plugins, OpenAPI, and a CLI built for automation.',

    // Rosetta-inspired palette: dark navy + gold (see .vitepress/theme/custom.css)
    appearance: 'force-dark',

    // GitHub Pages deployment base
    base: '/banana-universe/',

    head: [['link', { rel: 'icon', href: '/banana-universe/favicon.ico' }]],

    themeConfig: {
      logo: '/logo.svg',

      nav: [
        { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
        { text: 'Philosophy', link: '/guide/philosophy' },
        { text: 'Roadmap', link: '/guide/roadmap' },
        { text: 'Reference', link: '/reference/decorators', activeMatch: '/reference/' },
        { text: 'Integrations', link: '/integrations/typeorm', activeMatch: '/integrations/' },
        { text: 'Plugins', link: '/plugins/overview', activeMatch: '/plugins/' },
        { text: 'Tooling', link: '/tooling/cli', activeMatch: '/tooling/' },
        { text: 'API', link: '/api/', activeMatch: '/api/' },
      ],

      sidebar: {
        '/guide/': [
          {
            text: 'Introduction',
            items: [
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Philosophy', link: '/guide/philosophy' },
              { text: 'Basic Concepts', link: '/guide/basic-concepts' },
              { text: 'Advanced Concepts', link: '/guide/advanced-concepts' },
              { text: 'Roadmap (Phases 5–8)', link: '/guide/roadmap' },
            ],
          },
          {
            text: 'Architecture',
            items: [
              {
                text: 'Layered Architecture (Phase 6)',
                link: '/guide/layered-architecture',
              },
            ],
          },
          {
            text: 'Migration',
            items: [{ text: 'From Express', link: '/migration/from-express' }],
          },
        ],

        '/reference/': [
          {
            text: 'API Reference',
            items: [
              { text: 'Decorators', link: '/reference/decorators' },
              { text: 'BananaAppOptions', link: '/reference/bananaapp-options' },
              { text: 'Error Types', link: '/reference/error-types' },
              { text: 'Config Module', link: '/reference/config-module' },
            ],
          },
          {
            text: 'Auto-generated',
            items: [{ text: 'TypeDoc API Docs', link: '/api/' }],
          },
        ],

        '/integrations/': [
          {
            text: 'Integrations',
            items: [
              { text: 'TypeORM', link: '/integrations/typeorm' },
              { text: 'Prisma', link: '/integrations/prisma' },
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

        '/examples/': [
          {
            text: 'Example Apps',
            items: [{ text: 'Overview', link: '/examples/index' }],
          },
        ],
      },

      socialLinks: [{ icon: 'github', link: 'https://github.com/sprakas/banana-universe' }],

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2024-present Surya Prakash Manne',
      },

      editLink: {
        pattern: 'https://github.com/sprakas/banana-universe/edit/main/docs-site/:path',
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
