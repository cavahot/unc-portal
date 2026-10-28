'use client'

import { useFormatter } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

export interface StatCounterProps {
  value: number
  label: string
  prefix?: string
  suffix?: string
}

/** Duración de la cuenta animada, en ms. */
const COUNT_DURATION_MS = 1200

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

/**
 * Cifra de las estadísticas institucionales.
 *
 * Qué hace: muestra SIEMPRE el valor real en el HTML inicial (servidor, buscadores, sin JavaScript) y, solo en el
 * navegador y cuando la cifra entra en pantalla, la cuenta de 0 al valor.
 * Por qué: antes el estado inicial era 0, así que el HTML publicaba «0» en las seis cifras hasta que el visitante
 * llegaba a la sección, y la cuenta animada se ejecutaba aunque pidiera movimiento reducido.
 * Límite: con movimiento reducido o sin IntersectionObserver la cuenta no se anima y queda el valor final; si la
 * cifra ya está visible al montar, se verá un instante el reinicio a 0 antes de contar.
 */
export default function StatCounter({ value, label, prefix, suffix }: StatCounterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(value)
  const format = useFormatter()

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || !('IntersectionObserver' in window)) {
      setCount(value)
      return
    }

    let raf = 0
    setCount(0)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - start) / COUNT_DURATION_MS, 1)
          setCount(Math.round(easeOutQuart(progress) * value))
          if (progress < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.2 },
    )
    if (ref.current) observer.observe(ref.current)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value])

  return (
    <div
      ref={ref}
      className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center"
    >
      <span className="text-4xl font-bold tabular-nums text-[#5CFF5C] sm:text-5xl">
        {prefix}{format.number(count)}{suffix}
      </span>
      <span className="mt-2 text-sm text-white/50">{label}</span>
    </div>
  )
}
