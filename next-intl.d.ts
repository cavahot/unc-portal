import type esCommon from './messages/es/common.json';
import type esNav from './messages/es/nav.json';
import type esAccessibility from './messages/es/accessibility.json';
import type esPagesHome from './messages/es/pages.home.json';
import type esPagesNoticias from './messages/es/pages.noticias.json';
import type esPagesBuscar from './messages/es/pages.buscar.json';
import type esPagesTransparencia from './messages/es/pages.transparencia.json';
import type esPagesRevistas from './messages/es/pages.revistas.json';
import type esPagesBiblioteca from './messages/es/pages.biblioteca.json';
import type esPagesSolicitarTitulo from './messages/es/pages.solicitar-titulo.json';
import type esPagesInformacionPublica from './messages/es/pages.informacion-publica.json';
import type esPagesCarreras from './messages/es/pages.carreras.json';
import type esPagesFacultades from './messages/es/pages.facultades.json';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages {
    common: typeof esCommon;
    nav: typeof esNav;
    accessibility: typeof esAccessibility;
    pages: {
      home: typeof esPagesHome;
      noticias: typeof esPagesNoticias;
      buscar: typeof esPagesBuscar;
      transparencia: typeof esPagesTransparencia;
      revistas: typeof esPagesRevistas;
      biblioteca: typeof esPagesBiblioteca;
      'solicitar-titulo': typeof esPagesSolicitarTitulo;
      'informacion-publica': typeof esPagesInformacionPublica;
      carreras: typeof esPagesCarreras;
      facultades: typeof esPagesFacultades;
    };
  }
}
