'use client'

import React, { FC, useEffect, useState } from 'react'

const GRAVITY = 0.88
const INERTIA = 0.16
const DAMPING = 0.88
const MIN_VELOCITY_THRESHOLD = 0.008
const MIN_BUFFER = 4 // Minimum buffer distance between beans
const MAX_DISTANCE = 240 // Maximum distance a bean can stray from its offset

export const Beans: FC<{
  cursorPosition: { x: number; y: number }
  previousPosition: { x: number; y: number }
}> = ({ cursorPosition, previousPosition }) => {
  const [beans, setBeans] = useState<
    {
      id: number
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      offsetX: number
      offsetY: number
    }[]
  >([])

  // Initialize beans
  useEffect(() => {
    const generatedBeans = Array.from({ length: 5 }, () => ({
      id: Math.random(),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: Math.random() * 8 + 8, // Radius between 8 and 16
      offsetX: Math.random() * 60 - 30, // Initial offset from cursor
      offsetY: Math.random() * 60 - 30,
    }))
    setBeans(generatedBeans)
  }, [])

  // Update bean positions and resolve collisions
  useEffect(() => {
    const updateBeans = () => {
      const velocityX = cursorPosition.x - previousPosition.x
      const velocityY = cursorPosition.y - previousPosition.y

      setBeans((prevBeans) => {
        const updatedBeans = [...prevBeans]

        for (let i = 0; i < updatedBeans.length; i++) {
          const bean = updatedBeans[i]

          // Calculate pullback forces
          const targetX = cursorPosition.x + bean.offsetX
          const targetY = cursorPosition.y + bean.offsetY
          const dx = targetX - bean.x
          const dy = targetY - bean.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          // Prevent overshooting by clamping the force
          const pullX = (dx / distance) * GRAVITY
          const pullY = (dy / distance) * GRAVITY

          bean.vx = (bean.vx + pullX + velocityX * INERTIA) * DAMPING
          bean.vy = (bean.vy + pullY + velocityY * INERTIA) * DAMPING

          // Stop motion if velocity is negligible
          if (Math.abs(bean.vx) < MIN_VELOCITY_THRESHOLD) bean.vx = 0
          if (Math.abs(bean.vy) < MIN_VELOCITY_THRESHOLD) bean.vy = 0

          // Update position
          bean.x += bean.vx
          bean.y += bean.vy

          // Clamp bean position within MAX_DISTANCE
          const finalDx = bean.x - targetX
          const finalDy = bean.y - targetY
          const finalDistance = Math.sqrt(finalDx * finalDx + finalDy * finalDy)
          if (finalDistance > MAX_DISTANCE) {
            const clampedX = (finalDx / finalDistance) * MAX_DISTANCE
            const clampedY = (finalDy / finalDistance) * MAX_DISTANCE
            bean.x = targetX + clampedX
            bean.y = targetY + clampedY
          }
        }

        // Resolve collisions between beans
        for (let i = 0; i < updatedBeans.length; i++) {
          for (let j = i + 1; j < updatedBeans.length; j++) {
            const beanA = updatedBeans[i]
            const beanB = updatedBeans[j]

            const dx = beanB.x - beanA.x
            const dy = beanB.y - beanA.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const minDistance = beanA.radius + beanB.radius + MIN_BUFFER // Include buffer distance

            if (distance < minDistance) {
              // Calculate overlap and resolve collision
              const overlap = minDistance - distance
              const adjustX = (dx / distance) * overlap * 0.5
              const adjustY = (dy / distance) * overlap * 0.5

              beanA.x -= adjustX
              beanA.y -= adjustY
              beanB.x += adjustX
              beanB.y += adjustY

              // Dampen velocities to reduce oscillation
              beanA.vx *= DAMPING
              beanA.vy *= DAMPING
              beanB.vx *= DAMPING
              beanB.vy *= DAMPING
            }
          }
        }

        return updatedBeans
      })
    }

    const interval = setInterval(updateBeans, 16) // Update at ~60fps
    return () => clearInterval(interval)
  }, [cursorPosition, previousPosition])

  return (
    <>
      {beans.map((bean) => (
        <div
          key={bean.id}
          className="absolute bg-accent rounded-full pointer-events-none"
          style={{
            width: `${bean.radius * 2}px`,
            height: `${bean.radius * 2}px`,
            left: `${bean.x}px`,
            top: `${bean.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        ></div>
      ))}
    </>
  )
}
