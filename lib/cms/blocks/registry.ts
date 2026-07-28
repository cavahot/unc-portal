import type { ComponentType } from 'react';

import HeroBlock from '@/components/blocks/Hero';
import RichTextBlock from '@/components/blocks/RichText';
import CTABlock from '@/components/blocks/CTA';
import StatisticsBlock from '@/components/blocks/Statistics';
import TwoColumnBlock from '@/components/blocks/TwoColumn';
import TestimonialsBlock from '@/components/blocks/Testimonials';
import FAQBlock from '@/components/blocks/FAQ';

/**
 * Maps a Payload block's `blockType` to its React renderer.
 * Add new block types here as they are introduced in `apps/cms/src/blocks`.
 */
export const blockRegistry: Record<string, ComponentType<any>> = {
  hero: HeroBlock,
  richText: RichTextBlock,
  cta: CTABlock,
  statistics: StatisticsBlock,
  twoColumn: TwoColumnBlock,
  testimonials: TestimonialsBlock,
  faq: FAQBlock,
};
