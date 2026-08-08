import { cmsFetch } from '../client';
import type { Navegacion } from '@unc/cms-types';

export const FALLBACK_NAVIGATION: Navegacion = {
  id: 0,
  links: [
    { id: 'nav-inicio', label: 'Inicio', type: 'manual', url: '/', newTab: false, children: [] },
    {
      id: 'nav-institucional',
      label: 'Institucional',
      type: 'manual',
      url: '/institucional',
      newTab: false,
      children: [
        { id: 'nav-inst-historia', label: 'Historia', type: 'manual', url: '/historia', newTab: false },
        { id: 'nav-inst-mision', label: 'Misión, Visión y Valores', type: 'manual', url: '/mision-vision-y-valores', newTab: false },
        { id: 'nav-inst-autoridades', label: 'Autoridades', type: 'manual', url: '/autoridades', newTab: false },
        { id: 'nav-inst-organigrama', label: 'Organigrama', type: 'manual', url: '/organigrama', newTab: false },
        { id: 'nav-inst-legal', label: 'Marco Legal', type: 'manual', url: '/marco-legal', newTab: false },
        { id: 'nav-inst-transparencia', label: 'Transparencia', type: 'manual', url: '/transparencia', newTab: false },
        { id: 'nav-inst-ley5189', label: 'Ley 5189/2014', type: 'manual', url: '/ley-5189', newTab: false },
        { id: 'nav-inst-ley5282', label: 'Ley 5282/2014', type: 'manual', url: '/ley-5282', newTab: false },
        { id: 'nav-inst-tramites', label: 'Trámites', type: 'manual', url: '/tramites', newTab: false },
        { id: 'nav-inst-info-publica', label: 'Información Pública', type: 'manual', url: '/informacion-publica', newTab: false },
        { id: 'nav-inst-titulos', label: 'Títulos', type: 'manual', url: '/titulos', newTab: false },
        { id: 'nav-inst-legalizaciones', label: 'Legalizaciones', type: 'manual', url: '/legalizaciones', newTab: false },
        { id: 'nav-inst-solicitar-titulo', label: 'Solicitar Título', type: 'manual', url: '/solicitar-titulo', newTab: false },
        { id: 'nav-inst-convenios', label: 'Convenios', type: 'manual', url: '/convenios', newTab: false },
        { id: 'nav-inst-tribunal', label: 'Tribunal Electoral', type: 'manual', url: '/tribunal-electoral', newTab: false },
      ],
    },
    {
      id: 'nav-facultades',
      label: 'Facultades',
      type: 'manual',
      url: '#',
      newTab: false,
      children: [
        { id: 'nav-fac-odontologia', label: 'Facultad de Odontología', type: 'manual', url: '/facultades/odontologia', newTab: false },
        { id: 'nav-fac-medicina', label: 'Facultad de Medicina', type: 'manual', url: '/facultades/medicina', newTab: false },
        { id: 'nav-fac-agrarias', label: 'Facultad de Ciencias Agrarias', type: 'manual', url: '/facultades/agrarias', newTab: false },
        { id: 'nav-fac-exactas', label: 'Facultad de Ciencias Exactas y Tecnológicas', type: 'manual', url: '/facultades/ciencias-exactas', newTab: false },
        { id: 'nav-fac-humanidades', label: 'Facultad de Humanidades y Ciencias de la Educación', type: 'manual', url: '/facultades/humanidades', newTab: false },
        { id: 'nav-fac-economicas', label: 'Facultad de Ciencias Económicas y Administrativas', type: 'manual', url: '/facultades/ciencias-economicas', newTab: false },
        { id: 'nav-fac-aranceles', label: 'Aranceles Rectorado', type: 'manual', url: '/aranceles-rectorado', newTab: false },
      ],
    },
    { id: 'nav-noticias', label: 'Noticias', type: 'manual', url: '/noticias', newTab: false, children: [] },
    { id: 'nav-faq', label: 'Preguntas Frecuentes', type: 'manual', url: '/preguntas-frecuentes', newTab: false, children: [] },
    {
      id: 'nav-contactos',
      label: 'Contactos',
      type: 'manual',
      url: '/contacto',
      newTab: false,
      children: [
        { id: 'nav-cont-dependencia', label: 'Contactos por dependencia', type: 'manual', url: '/contacto/dependencias', newTab: false },
      ],
    },
    {
      id: 'nav-academia',
      label: 'Academia',
      type: 'manual',
      url: '#',
      newTab: false,
      children: [
        { id: 'nav-acad-dga', label: 'Dirección General Académica', type: 'manual', url: '/direccion-general-academica', newTab: false },
        { id: 'nav-acad-calidad', label: 'Aseguramiento de la Calidad', type: 'manual', url: '/aseguramiento-calidad', newTab: false },
        { id: 'nav-acad-investigacion', label: 'Investigación', type: 'manual', url: '/investigacion', newTab: false },
        { id: 'nav-acad-extension', label: 'Extensión y Vinculación', type: 'manual', url: '/extension', newTab: false },
        { id: 'nav-acad-bienestar', label: 'Bienestar Institucional', type: 'manual', url: '/bienestar-institucional', newTab: false },
        { id: 'nav-acad-revistas', label: 'Revistas Académicas', type: 'manual', url: '/revistas', newTab: false },
        { id: 'nav-acad-biblioteca', label: 'Biblioteca Digital', type: 'manual', url: '/biblioteca', newTab: false },
      ],
    },
  ],
};

export async function getNavigation(): Promise<Navegacion> {
  try {
    const nav = await cmsFetch<Navegacion>('/globals/navegacion?depth=2', {
      tags: ['navegacion'],
    });
    // Use fallback when CMS navigation hasn't been configured yet
    if (!nav.links || nav.links.length === 0) {
      return FALLBACK_NAVIGATION;
    }
    return nav;
  } catch (error) {
    console.error('[Navigation] Falling back to hardcoded navigation:', error);
    return FALLBACK_NAVIGATION;
  }
}
