'use client'

import React, { FC, useEffect, useRef, useState } from 'react'
import { Beans } from './Beans'
import { Oni } from './Oni'
import { ErrorMessage } from './ErrorMessage'

export const OniGame: FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [previousPosition, setPreviousPosition] = useState({ x: 0, y: 0 })
  const [onis, setOnis] = useState<{ id: number; x: number; y: number }[]>([])

  // Track cursor movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      setPreviousPosition(cursorPosition)
      setCursorPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [cursorPosition])

  return (
    <div
      ref={canvasRef}
      className="w-screen h-screen bg-background relative overflow-hidden cursor-none"
    >
      {/* Counter */}
      <div className="absolute top-4 right-4 text-foreground flex flex-col gap-2">
        <span id="oni-counter" className="text-lg font-bold">
          {onis.length} little Oni in the code
        </span>
      </div>

      <ErrorMessage />

      {/* Cursor Beans */}
      <Beans
        cursorPosition={cursorPosition}
        previousPosition={previousPosition}
      />

      {/* Oni Spawner */}
      <Oni canvasRef={canvasRef} onis={onis} setOnis={setOnis} />
    </div>
  )
}
