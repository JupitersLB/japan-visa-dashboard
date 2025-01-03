'use client'

import React, { useEffect, useRef } from 'react'

const Error = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Draw "500" with gradient
        ctx.font = '15em Righteous'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#7C3AED' // primary.DEFAULT
        ctx.fillText('500', canvas.width / 2, canvas.height / 2)

        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        grad.addColorStop(0, '#111827') // background.DEFAULT
        grad.addColorStop(1, '#4C1D95') // primary.dark
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }

    // Animation logic
    const animateError = (el: HTMLElement, offset: number) => {
      const wrapper = document.querySelector('.wrapper') as HTMLElement
      const wrapperWidth = wrapper.offsetWidth
      const wrapperHeight = wrapper.offsetHeight

      for (let i = 0; i < 500; i++) {
        const clone = el.cloneNode(true) as HTMLElement
        const x = Math.random() * wrapperWidth
        const y = Math.random() * wrapperHeight

        wrapper.appendChild(clone)

        clone.style.position = 'absolute'
        clone.style.top = `${x}px`
        clone.style.left = `${offset + y}px`
        clone.style.opacity = '1'
        setTimeout(() => {
          clone.style.transform = `translate(${Math.random() * wrapperWidth}px, ${
            Math.random() * wrapperHeight
          }px)`
          clone.style.opacity = '0'
        }, 0)
      }
    }

    const left = document.querySelector('.left') as HTMLElement
    const right = document.querySelector('.right') as HTMLElement

    left?.addEventListener('click', () => animateError(left, -200))
    right?.addEventListener('click', () => animateError(right, 500))

    setTimeout(() => {
      right?.click()
      left?.click()
    }, 100)
  }, [])

  return (
    <div className="wrapper w-full h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="left text-neutral">Error</div>
      <div className="right text-neutral">Error</div>
      <canvas
        ref={canvasRef}
        width="550"
        height="205"
        className="absolute z-10"
      ></canvas>
      <h1 className="bg-primary text-foreground text-center text-lg px-4 py-2 rounded-full">
        Error
      </h1>
    </div>
  )
}

export default Error
