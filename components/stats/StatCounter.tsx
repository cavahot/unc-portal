'use client'

import { useFormatter } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

export interface StatCounterProps {
  value: number
  label: string
  prefix?: string
  suffix?: string
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

export default function StatCounter({ value, label, prefix, suffix }: StatCounterProps) {
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const count = useCountUp(value, 1200, active)
  const format = useFormatter()

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
