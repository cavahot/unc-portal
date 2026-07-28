import type { Block } from 'payload'

import { Hero } from './Hero'
import { RichText } from './RichText'
import { CTA } from './CTA'
import { Statistics } from './Statistics'
import { TwoColumn } from './TwoColumn'
import { Testimonials } from './Testimonials'
import { FAQ } from './FAQ'

export const PageBuilderBlocks: Block[] = [
  Hero,
  RichText,
  CTA,
  Statistics,
  TwoColumn,
  Testimonials,
  FAQ,
]

export { Hero, RichText, CTA, Statistics, TwoColumn, Testimonials, FAQ }
