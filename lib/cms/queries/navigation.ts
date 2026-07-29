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
      url: 'https://www.unc.edu.py/institucional/',
      newTab: false,
      children: [
        { id: 'nav-inst-historia', label: 'Historia', type: 'manual', url: 'https://www.unc.edu.py/historia-3/', newTab: false },
        { id: 'nav-inst-mision', label: 'Misión, Visión y Valores', type: 'manual', url: 'https://www.unc.edu.py/mision-vision-y-valores/', newTab: false },
        { id: 'nav-inst-legal', label: 'Marco Legal', type: 'manual', url: 'https://www.unc.edu.py/marco-legal/', newTab: false },
        { id: 'nav-inst-organigrama', label: 'Organigrama', type: 'manual', url: 'https://www.unc.edu.py/organigrama/', newTab: false },
        { id: 'nav-inst-autoridades', label: 'Autoridades', type: 'manual', url: 'https://www.unc.edu.py/autoridades/', newTab: false },
        { id: 'nav-inst-transparencia', label: 'Transparencia', type: 'manual', url: 'https://www.unc.edu.py/transparencia/', newTab: false },
        { id: 'nav-inst-tramites', label: 'Trámites', type: 'manual', url: 'https://www.unc.edu.py/tramites/', newTab: false },
        { id: 'nav-inst-titulos', label: 'Títulos', type: 'manual', url: 'https://www.unc.edu.py/titulos/', newTab: false },
        { id: 'nav-inst-legalizaciones', label: 'Legalizaciones', type: 'manual', url: 'https://www.unc.edu.py/legalizaciones/', newTab: false },
        { id: 'nav-inst-solicitud', label: 'Solicitud de gestión de títulos', type: 'manual', url: 'https://www.unc.edu.py/solicitud-de-gestion-de-titulos/', newTab: false },
        { id: 'nav-inst-convenios', label: 'Convenios', type: 'manual', url: 'https://www.unc.edu.py/convenios/', newTab: false },
        { id: 'nav-inst-tribunal', label: 'Tribunal Electoral', type: 'manual', url: 'https://www.unc.edu.py/tribunal-electoral/', newTab: false },
      ],
    },
    {
      id: 'nav-facultades',
      label: 'Facultades',
      type: 'manual',
      url: '#',
      newTab: false,
      children: [
        { id: 'nav-fac-odontologia', label: 'Facultad de Odontología', type: 'manual', url: 'https://www.unc.edu.py/facultad-de-odontologia/', newTab: false },
        { id: 'nav-fac-medicina', label: 'Facultad de Medicina', type: 'manual', url: 'https://www.unc.edu.py/facultad-de-medicina/', newTab: false },
        { id: 'nav-fac-agrarias', label: 'Facultad de Ciencias Agrarias', type: 'manual', url: 'https://www.unc.edu.py/facultad-de-ciencias-agrarias/', newTab: false },
        { id: 'nav-fac-exactas', label: 'Facultad de Ciencias Exactas y Tecnológicas', type: 'manual', url: 'https://www.unc.edu.py/facultad-de-ciencias-exactas-y-tecnologicas/', newTab: false },
        { id: 'nav-fac-humanidades', label: 'Facultad de Humanidades y Ciencias de la Educación', type: 'manual', url: 'https://www.unc.edu.py/facultad-de-humanidades-y-ciencias-de-la-educacion/', newTab: false },
        { id: 'nav-fac-economicas', label: 'Facultad de Ciencias Económicas y Administrativas', type: 'manual', url: 'https://www.unc.edu.py/facultad-de-ciencias-economicas-y-administrativas/', newTab: false },
        { id: 'nav-fac-aranceles', label: 'Aranceles Rectorado', type: 'manual', url: 'https://www.unc.edu.py/aranceles-rectorado/', newTab: false },
      ],
    },
    { id: 'nav-noticias', label: 'Noticias', type: 'manual', url: '/noticias', newTab: false, children: [] },
    { id: 'nav-faq', label: 'Preguntas Frecuentes', type: 'manual', url: 'https://www.unc.edu.py/preguntas-frecuentes/', newTab: false, children: [] },
    {
      id: 'nav-contactos',
      label: 'Contactos',
      type: 'manual',
      url: 'https://www.unc.edu.py/contacto/',
      newTab: false,
      children: [
        { id: 'nav-cont-dependencia', label: 'Contactos por dependencia', type: 'manual', url: 'https://www.unc.edu.py/contactos-por-dependencia/', newTab: false },
      ],
    },
    {
      id: 'nav-academia',
      label: 'Academia',
      type: 'manual',
      url: '#',
      newTab: false,
      children: [
        { id: 'nav-acad-dga', label: 'Dirección General Académica', type: 'manual', url: 'https://www.unc.edu.py/direccion-general-academica/', newTab: false },
        { id: 'nav-acad-calidad', label: 'Aseguramiento de la Calidad', type: 'manual', url: 'https://www.unc.edu.py/aseguramiento-de-la-calidad/', newTab: false },
        { id: 'nav-acad-investigacion', label: 'Investigación', type: 'manual', url: 'https://www.unc.edu.py/investigacion/', newTab: false },
        { id: 'nav-acad-extension', label: 'Extensión y Vinculación', type: 'manual', url: 'https://www.unc.edu.py/extension-y-vinculacion/', newTab: false },
        { id: 'nav-acad-bienestar', label: 'Bienestar Institucional', type: 'manual', url: 'https://www.unc.edu.py/bienestar-institucional/', newTab: false },
      ],
    },
    { id: 'nav-aula', label: 'Aula Virtual', type: 'manual', url: 'https://www.unc.edu.py/aula-virtual/', newTab: false, children: [] },
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
