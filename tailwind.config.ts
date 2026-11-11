import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'
import forms from '@tailwindcss/forms'

export default {
  // app/ is scanned automatically by @nuxtjs/tailwindcss; markdown may use classes too
  content: ['./content/**/*.md'],
  plugins: [typography, forms],
} satisfies Partial<Config>
