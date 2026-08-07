'use client'

import { useState } from 'react'

/* ─── Types ───────────────────────────────────────────────────────────────── */

type NodeType =
  | 'governing'
  | 'executive'
  | 'secretariat'
  | 'direction-general'
  | 'direction'
  | 'coordination'
  | 'department'
  | 'area'
  | 'section'

interface OrgNodeData {
  id: string
  name: string
  type: NodeType
  children?: OrgNodeData[]
}

/* ─── Tree data ───────────────────────────────────────────────────────────── */

const ORG_TREE: OrgNodeData = {
  id: 'asamblea',
  name: 'Asamblea Universitaria',
  type: 'governing',
  children: [
    {
      id: 'csu',
      name: 'Consejo Superior Universitario',
      type: 'governing',
      children: [
        {
          id: 'rectorado',
          name: 'Rectorado',
          type: 'executive',
          children: [
            { id: 'sec-privada', name: 'Secretaría Privada', type: 'secretariat' },
            {
              id: 'sec-general',
              name: 'Secretaría General',
              type: 'secretariat',
              children: [
                { id: 'sec-archivo',   name: 'Secretaría de Archivo y Control Académico', type: 'secretariat' },
                { id: 'sec-recepcion', name: 'Secretaría de Recepción y Trámite de Documentos (Mesa de Entrada)', type: 'secretariat' },
                { id: 'sec-info',      name: 'Secretaría de Información, Comunicación y Atención al Ciudadano', type: 'secretariat' },
              ],
            },
            {
              id: 'vicerrectorado',
              name: 'Vicerrectorado',
              type: 'executive',
              children: [
                { id: 'dir-auditoria',   name: 'Dirección de Auditoría Interna', type: 'direction' },
                { id: 'coord-mecip',     name: 'Coordinación MECIP', type: 'coordination' },
                { id: 'coord-informatica', name: 'Coordinación de Informática', type: 'coordination' },
              ],
            },
            {
              id: 'dg-admin',
              name: 'Dirección General de Administración y Finanzas',
              type: 'direction-general',
              children: [
                { id: 'depto-control', name: 'Departamento de Control Previo', type: 'department' },
                { id: 'area-almacen',  name: 'Área de Almacén', type: 'area' },
                {
                  id: 'dir-contabilidad',
                  name: 'Dirección de Contabilidad',
                  type: 'direction',
                  children: [
                    { id: 'depto-bienes', name: 'Departamento de Bienes Patrimoniales', type: 'department' },
                  ],
                },
                { id: 'dir-uoc',        name: 'Dirección de UOC', type: 'direction' },
                { id: 'dir-presupuesto', name: 'Dirección de Presupuesto', type: 'direction' },
                {
                  id: 'dir-tesoreria',
                  name: 'Dirección de Tesorería',
                  type: 'direction',
                  children: [
                    { id: 'sec-ingresos', name: 'Sección de Ingresos', type: 'section' },
                    { id: 'sec-egresos',  name: 'Sección Egresos', type: 'section' },
                    { id: 'enlace-pagos', name: 'Enlace Administrativo de Pagos', type: 'section' },
                  ],
                },
              ],
            },
            {
              id: 'dir-personas',
              name: 'Dirección de Gestión y Desarrollo de las Personas',
              type: 'direction',
              children: [
                { id: 'area-sinarh',   name: 'Área Técnica SINARH', type: 'area' },
                { id: 'area-servicios', name: 'Área de Servicios', type: 'area' },
              ],
            },
            { id: 'dir-juridica', name: 'Dirección de Asesoría Jurídica', type: 'direction' },
            {
              id: 'dg-posgrado',
              name: 'Dirección General de Posgrado',
              type: 'direction-general',
              children: [
                { id: 'sec-academica', name: 'Secretaría Académica', type: 'secretariat' },
              ],
            },
            {
              id: 'dg-academica',
              name: 'Dirección General Académica',
              type: 'direction-general',
              children: [
                { id: 'coord-calidad',       name: 'Coordinación de Aseguramiento de la Calidad', type: 'coordination' },
                { id: 'coord-evaluacion',    name: 'Coordinación de Evaluación y Estadística', type: 'coordination' },
                { id: 'coord-investigacion', name: 'Coordinación de Investigación', type: 'coordination' },
                { id: 'coord-extension',     name: 'Coordinación de Extensión Universitaria', type: 'coordination' },
                { id: 'sec-relaciones',      name: 'Secretaría de Relaciones Interinstitucionales', type: 'secretariat' },
                { id: 'coord-biblioteca',    name: 'Coordinación de Biblioteca Central', type: 'coordination' },
              ],
            },
            {
              id: 'dir-planificacion',
              name: 'Dirección de Planificación Técnica y Fiscalización',
              type: 'direction',
              children: [
                { id: 'coord-calidad2',       name: 'Coordinación de Aseguramiento de la Calidad', type: 'coordination' },
                { id: 'area-planificacion',   name: 'Área de Planificación Técnica', type: 'area' },
                { id: 'area-fiscalizacion',   name: 'Área de Fiscalización', type: 'area' },
              ],
            },
            { id: 'dir-filial', name: 'Dirección de Filial', type: 'direction' },
          ],
        },
      ],
    },
  ],
}

/* ─── Node style config ───────────────────────────────────────────────────── */

const CFG: Record<NodeType, {
  label: string
  solid: boolean   // true = colored bg + white text; false = accent border + tinted bg
  bg: string
  border: string
  text: string
  dot: string
}> = {
  governing: {
    label: 'Órgano de Gobierno',
    solid: true,
    bg: '#1e3a5f',
    border: '#1e3a5f',
    text: '#ffffff',
    dot: '#1e3a5f',
  },
  executive: {
    label: 'Autoridad Ejecutiva',
    solid: true,
    bg: '#004700',
    border: '#004700',
    text: '#ffffff',
    dot: '#004700',
  },
  secretariat: {
    label: 'Secretaría',
    solid: false,
    bg: '#ecfdf5',
    border: '#065f46',
    text: '#065f46',
    dot: '#065f46',
  },
  'direction-general': {
    label: 'Dirección General',
    solid: false,
    bg: '#f0fdf4',
    border: '#2D5C3A',
    text: '#2D5C3A',
    dot: '#2D5C3A',
  },
  direction: {
    label: 'Dirección',
    solid: false,
    bg: '#f4f7f5',
    border: '#3d6b4f',
    text: '#3d6b4f',
    dot: '#3d6b4f',
  },
  coordination: {
    label: 'Coordinación',
    solid: false,
    bg: '#f8faf9',
    border: '#4a7c5c',
    text: '#4a7c5c',
    dot: '#4a7c5c',
  },
  department: {
    label: 'Departamento',
    solid: false,
    bg: '#f8fafc',
    border: '#475569',
    text: '#475569',
    dot: '#475569',
  },
  area: {
    label: 'Área',
    solid: false,
    bg: '#f8fafc',
    border: '#64748b',
    text: '#64748b',
    dot: '#64748b',
  },
  section: {
    label: 'Sección',
    solid: false,
    bg: '#f8fafc',
    border: '#94a3b8',
    text: '#94a3b8',
    dot: '#94a3b8',
  },
}

const CONNECTOR = '#cbd5e1' // slate-300

/* ─────────────────────────────────────────────────────────────────────────── */
/*  DESKTOP: compact tree diagram                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

const CARD_W = 152  // px
const GAP    = 10   // px between siblings
const V_DROP = 24   // px vertical connector length

function DesktopCard({
  node,
  hasChildren,
  isExpanded,
  onToggle,
}: {
  node: OrgNodeData
  hasChildren: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  const cfg = CFG[node.type]

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md"
      style={{
        width: CARD_W,
        border: cfg.solid ? 'none' : `1px solid ${cfg.border}30`,
        borderLeft: `3px solid ${cfg.border}`,
        backgroundColor: cfg.solid ? cfg.bg : cfg.bg,
      }}
    >
      {/* Type label */}
      <div
        className="px-2.5 pt-2"
        style={cfg.solid ? {} : {}}
      >
        <span
          className="inline-block rounded-full px-1.5 py-0.5 text-[0.42rem] font-extrabold uppercase tracking-[0.1em]"
          style={
            cfg.solid
              ? { backgroundColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }
              : { backgroundColor: `${cfg.border}15`, color: cfg.border }
          }
        >
          {cfg.label}
        </span>
      </div>

      {/* Name */}
      <div className="flex-1 px-2.5 pb-2.5 pt-1">
        <p
          className="text-[0.68rem] font-bold leading-tight"
          style={{ color: cfg.solid ? '#fff' : cfg.text }}
        >
          {node.name}
        </p>
      </div>

      {/* Expand / collapse */}
      {hasChildren && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center gap-1 border-t py-1.5 text-[0.55rem] font-bold transition-colors"
          style={{
            borderColor: cfg.solid ? 'rgba(255,255,255,0.15)' : `${cfg.border}20`,
            backgroundColor: cfg.solid ? 'rgba(0,0,0,0.12)' : `${cfg.border}08`,
            color: cfg.solid ? 'rgba(255,255,255,0.8)' : cfg.border,
          }}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
        >
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            className="h-2.5 w-2.5 transition-transform duration-200"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {isExpanded ? 'Ocultar' : `${node.children!.length} dep.`}
        </button>
      )}
    </div>
  )
}

function DesktopNode({
  node,
  expandedIds,
  onToggle,
}: {
  node: OrgNodeData
  expandedIds: Set<string>
  onToggle: (id: string) => void
}) {
  const hasChildren = !!node.children?.length
  const isExpanded  = expandedIds.has(node.id)

  return (
    <div className="flex flex-col items-center">
      <DesktopCard
        node={node}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onToggle={() => onToggle(node.id)}
      />

      {hasChildren && isExpanded && (
        <>
          {/* Drop line */}
          <div
            aria-hidden="true"
            className="w-px"
            style={{ height: V_DROP, backgroundColor: CONNECTOR }}
          />

          {/* Children row */}
          <div className="relative flex" style={{ gap: GAP }}>
            {/* Horizontal crossbar */}
            {node.children!.length > 1 && (
              <div
                aria-hidden="true"
                className="absolute h-px"
                style={{
                  top: 0,
                  left:  CARD_W / 2,
                  right: CARD_W / 2,
                  backgroundColor: CONNECTOR,
                }}
              />
            )}

            {node.children!.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div
                  aria-hidden="true"
                  className="w-px"
                  style={{ height: V_DROP, backgroundColor: CONNECTOR }}
                />
                <DesktopNode
                  node={child}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  MOBILE: indented accordion                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

function MobileNode({
  node,
  depth = 0,
  isLast = false,
}: {
  node: OrgNodeData
  depth?: number
  isLast?: boolean
}) {
  const hasChildren = !!node.children?.length
  const [open, setOpen] = useState(depth < 2)
  const cfg = CFG[node.type]

  const indent = depth * 16

  return (
    <div className="relative">
      {/* Vertical guide line for non-root */}
      {depth > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 w-px"
          style={{
            left: indent - 10,
            bottom: isLast ? '50%' : 0,
            backgroundColor: '#e2e8f0',
          }}
        />
      )}

      {/* Row */}
      <div
        className="relative flex items-start gap-2 py-1.5"
        style={{ paddingLeft: indent + 4 }}
      >
        {/* Horizontal guide */}
        {depth > 0 && (
          <div
            aria-hidden="true"
            className="absolute top-[1.1rem] h-px w-2.5"
            style={{ left: indent - 10, backgroundColor: '#e2e8f0' }}
          />
        )}

        {/* Dot indicator */}
        <span
          className="mt-[0.35rem] h-2 w-2 shrink-0 rounded-full ring-2 ring-white"
          style={{ backgroundColor: cfg.dot }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <p className="min-w-0 flex-1 text-[0.78rem] font-semibold leading-snug text-slate-800">
              {node.name}
            </p>
            {hasChildren && (
              <button
                onClick={() => setOpen(o => !o)}
                className="shrink-0 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-expanded={open}
                aria-label={open ? 'Colapsar' : 'Expandir'}
              >
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                  className="h-3.5 w-3.5 transition-transform duration-200"
                  style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
          </div>
          <span
            className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-wider"
            style={{ color: cfg.dot }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div>
          {node.children!.map((child, i) => (
            <MobileNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={i === node.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Legend                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function Legend() {
  const types: NodeType[] = [
    'governing', 'executive', 'secretariat', 'direction-general',
    'direction', 'coordination', 'department', 'area', 'section',
  ]
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {types.map((type) => {
        const cfg = CFG[type]
        return (
          <div
            key={type}
            className="flex items-center gap-1.5 rounded-full border px-2 py-1"
            style={{ borderColor: `${cfg.dot}30`, backgroundColor: `${cfg.dot}0d` }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: cfg.dot }}
              aria-hidden="true"
            />
            <span className="text-[0.6rem] font-bold" style={{ color: cfg.dot }}>
              {cfg.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Export                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function collectIds(node: OrgNodeData, ids: Set<string> = new Set()): Set<string> {
  if (node.children?.length) {
    ids.add(node.id)
    node.children.forEach(c => collectIds(c, ids))
  }
  return ids
}

const ALL_IDS = collectIds(ORG_TREE)

export function OrgChart() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(['asamblea', 'csu', 'rectorado']),
  )

  function toggle(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#6C7B76]">
          Hacé clic en los nodos para expandir o colapsar dependencias.
        </p>
        {/* Only show on desktop */}
        <div className="hidden gap-2 md:flex">
          <button
            onClick={() => setExpandedIds(new Set(ALL_IDS))}
            className="rounded-full border border-[#D7E0DB] bg-white px-3 py-1.5 text-xs font-bold text-[#004700] transition-colors hover:bg-[#E6FFE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
          >
            Expandir todo
          </button>
          <button
            onClick={() => setExpandedIds(new Set())}
            className="rounded-full border border-[#D7E0DB] bg-white px-3 py-1.5 text-xs font-bold text-[#6C7B76] transition-colors hover:bg-[#F4F7F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
          >
            Colapsar todo
          </button>
        </div>
      </div>

      {/* ── DESKTOP tree (md+) ── */}
      <div className="hidden md:block">
        <div className="overflow-auto rounded-2xl border border-[#D7E0DB] bg-white p-8 shadow-[0_8px_32px_rgba(7,42,15,0.06)]">
          <div className="flex min-w-max justify-center pb-4">
            <DesktopNode
              node={ORG_TREE}
              expandedIds={expandedIds}
              onToggle={toggle}
            />
          </div>
        </div>
        <Legend />
      </div>

      {/* ── MOBILE accordion (< md) ── */}
      <div className="md:hidden">
        <div className="rounded-2xl border border-[#D7E0DB] bg-white px-4 py-5 shadow-[0_8px_32px_rgba(7,42,15,0.06)]">
          <MobileNode node={ORG_TREE} depth={0} />
        </div>
        {/* Mobile legend - compact */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(['governing','executive','direction-general','direction','coordination'] as NodeType[]).map(type => {
            const cfg = CFG[type]
            return (
              <div
                key={type}
                className="flex items-center gap-1 rounded-full border px-2 py-0.5"
                style={{ borderColor: `${cfg.dot}30`, backgroundColor: `${cfg.dot}0d` }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cfg.dot }} aria-hidden="true" />
                <span className="text-[0.55rem] font-bold" style={{ color: cfg.dot }}>{cfg.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
