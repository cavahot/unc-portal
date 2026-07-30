'use client'

import { useEffect, useRef, useState } from 'react'

// UNC comenzó operaciones el 3 de agosto de 2009
const FOUNDING_DATE = new Date('2009-08-03')

function daysSinceFounding(): number {
  return Math.floor((Date.now() - FOUNDING_DATE.getTime()) / 86_400_000)
}

const STATS = [
  { value: daysSinceFounding(), label: 'Días de actividad' },
  { value: 4985, label: 'Estudiantes' },
  { value: 10,   label: 'Carreras acreditadas' },
  { value: 762,  label: 'Docentes y colaboradores' },
  { value: 6,    label: 'Facultades' },
  { value: 672,  label: 'Egresados' },
]

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

function useCountUp(target: number, duration: number, active: boolean): number {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!active) return
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.round(easeOutQuart(progress) * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, target, duration])

  return count
}

function StatCard({ value, label, active }: { value: number; label: string; active: boolean }) {
  const count = useCountUp(value, 1200, active)
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center">
      <span className="text-4xl font-bold tabular-nums text-[#5CFF5C] sm:text-5xl">
        {count.toLocaleString('es-PY')}
      </span>
      <span className="mt-2 text-sm text-white/50">{label}</span>
    </div>
  )
}

export default function StatsBlock() {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setActive(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="bg-slate-900 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">UNC en números</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Estadísticas institucionales</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {STATS.map((stat) => (
            <StatCard key={stat.label} value={stat.value} label={stat.label} active={active} />
          ))}
        </div>
      </div>
    </section>
  )
}
