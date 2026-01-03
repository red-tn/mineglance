'use client'

import { useEffect, useRef } from 'react'

interface Point {
  x: number
  y: number
  vx: number
  vy: number
  connections: number[]
}

export default function WireframeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let points: Point[] = []
    const numPoints = 80
    const connectionDistance = 150
    const mouseRadius = 200

    let mouseX = -1000
    let mouseY = -1000

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initPoints()
    }

    const initPoints = () => {
      points = []
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          connections: []
        })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    const handleMouseLeave = () => {
      mouseX = -1000
      mouseY = -1000
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update points
      for (const point of points) {
        point.x += point.vx
        point.y += point.vy

        // Bounce off edges
        if (point.x < 0 || point.x > canvas.width) point.vx *= -1
        if (point.y < 0 || point.y > canvas.height) point.vy *= -1

        // Keep in bounds
        point.x = Math.max(0, Math.min(canvas.width, point.x))
        point.y = Math.max(0, Math.min(canvas.height, point.y))

        // Mouse interaction - subtle push
        const dx = point.x - mouseX
        const dy = point.y - mouseY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouseRadius && dist > 0) {
          const force = (mouseRadius - dist) / mouseRadius * 0.02
          point.vx += (dx / dist) * force
          point.vy += (dy / dist) * force
        }

        // Speed limit
        const speed = Math.sqrt(point.vx * point.vx + point.vy * point.vy)
        if (speed > 1) {
          point.vx = (point.vx / speed) * 1
          point.vy = (point.vy / speed) * 1
        }
      }

      // Draw connections
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x
          const dy = points[i].y - points[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * 0.15
            ctx.beginPath()
            ctx.moveTo(points[i].x, points[i].y)
            ctx.lineTo(points[j].x, points[j].y)
            ctx.strokeStyle = `rgba(56, 161, 105, ${opacity})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      // Draw points
      for (const point of points) {
        // Check mouse proximity for glow
        const dx = point.x - mouseX
        const dy = point.y - mouseY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const glow = dist < mouseRadius ? (1 - dist / mouseRadius) * 0.5 : 0

        ctx.beginPath()
        ctx.arc(point.x, point.y, 2 + glow * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(56, 161, 105, ${0.3 + glow * 0.5})`
        ctx.fill()
      }

      animationId = requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0d1520 100%)' }}
    />
  )
}
