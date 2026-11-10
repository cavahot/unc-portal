'use client'

// MENU-CMS-03 (S2): etiqueta de cada fila del menú en el panel («Academia · 7 subenlaces» en lugar de «Link 07»).
// Por qué existe: sin ella había que abrir fila por fila para saber qué enlace era cada una.
// Límite: solo muestra datos del formulario; no los cambia.
import React from 'react'
import { useRowLabel } from '@payloadcms/ui'
import { rowLabelFor } from '../../utilities/navegacionTree'

export const NavegacionRowLabel: React.FC = () => {
  const { data } = useRowLabel<{ label?: string; children?: unknown[] }>()
  return <span>{rowLabelFor(data as never)}</span>
}
