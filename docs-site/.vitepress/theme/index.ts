import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

const theme: Theme = {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // Inject a BETA pill next to the site title in the top nav
      'nav-bar-title-after': () =>
        h('span', { class: 'nav-beta-pill', 'aria-label': 'Public beta' }, 'Beta'),
    })
  },
}

export default theme
