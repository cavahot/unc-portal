import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['es', 'en', 'pt-BR', 'gn'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
})
