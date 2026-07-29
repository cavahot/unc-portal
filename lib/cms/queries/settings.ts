import { cmsFetch } from '../client';

export interface TempSettings {
  logo?: {
    url?: string;
    alt?: string;
  } | null;
  siteName: string;
  seoDefaults?: {
    title?: string;
    description?: string;
  } | null;
}

export async function getSettings(): Promise<TempSettings> {
  return cmsFetch<TempSettings>('/globals/site-settings', {
    tags: ['configuracion'],
  });
}
