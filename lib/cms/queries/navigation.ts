import { cmsFetch } from '../client';
import type { Navegacion } from '@unc/cms-types';

export const FALLBACK_NAVIGATION: Navegacion = {
  id: 0,
  links: [
    { id: 'fallback-institucional', label: 'Institucional', type: 'manual', url: '/institucional', newTab: false, children: [] },
    { id: 'fallback-estudiar', label: 'Estudiar en la UNC', type: 'manual', url: '/estudiar', newTab: false, children: [] },
    { id: 'fallback-investigacion', label: 'Investigación', type: 'manual', url: '/investigacion', newTab: false, children: [] },
    { id: 'fallback-extension', label: 'Extensión', type: 'manual', url: '/extension', newTab: false, children: [] },
    { id: 'fallback-transparencia', label: 'Transparencia', type: 'manual', url: '/transparencia', newTab: false, children: [] },
    { id: 'fallback-tramites', label: 'Trámites', type: 'manual', url: '/tramites', newTab: false, children: [] },
    { id: 'fallback-noticias', label: 'Noticias', type: 'manual', url: '/noticias', newTab: false, children: [] },
  ],
};

export async function getNavigation(): Promise<Navegacion> {
  try {
    return await cmsFetch<Navegacion>('/globals/navegacion?depth=2', {
      tags: ['navegacion'],
    });
  } catch (error) {
    console.error('[Navigation] Falling back to hardcoded navigation:', error);
    return FALLBACK_NAVIGATION;
  }
}
