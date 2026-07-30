'use client'

import { useTranslations, useFormatter } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

// UNC began operations on August 3, 2009
const FOUNDING_DATE = new Date('2009-08-03')

function daysSinceFounding(): number {
  return Math.floor((Date.now() - FOUNDING_DATE.getTime()) / 86_400_000)
}

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

function StatCard({
  value,
  label,
  active,
}: {
  value: number
  label: string
  active: boolean
}) {
  const count = useCountUp(value, 1200, active)
  const format = useFormatter()

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center">
      <span className="text-4xl font-bold tabular-nums text-[#5CFF5C] sm:text-5xl">
        {format.number(count)}
      </span>
      <span className="mt-2 text-sm text-white/50">{label}</span>
    </div>
  )
}

export default function StatsBlock() {
  const t = useTranslations('pages.home')
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(false)

  const stats = [
    { value: daysSinceFounding(), label: t('stats.items.diasActividad') },
    { value: 4985,               label: t('stats.items.estudiantes') },
    { value: 10,                 label: t('stats.items.carrerasAcreditadas') },
    { value: 762,                label: t('stats.items.docentesColaboradores') },
    { value: 6,                  label: t('stats.items.facultades') },
    { value: 672,                label: t('stats.items.egresados') },
  ]

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
      { threshold: 0.2 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="bg-slate-900 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5CFF5C]">
            {t('stats.sectionLabel')}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white">
            {t('stats.title')}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} value={stat.value} label={stat.label} active={active} />
          ))}
        </div>
      </div>
    </section>
  )
}
