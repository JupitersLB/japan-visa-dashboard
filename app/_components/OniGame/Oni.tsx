import React, { FC, useEffect, useRef } from 'react'

export const Oni: FC<{
  canvasRef: React.RefObject<HTMLDivElement | null>
  onis: { id: number; x: number; y: number }[]
  setOnis: React.Dispatch<
    React.SetStateAction<{ id: number; x: number; y: number }[]>
  >
}> = ({ canvasRef, onis, setOnis }) => {
  const oniIdRef = useRef(0)

  // Spawn Oni periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!canvasRef.current) return

      const canvas = canvasRef.current
      const newOni = {
        id: oniIdRef.current++,
        x: Math.random() * (canvas.offsetWidth - 40),
        y: Math.random() * (canvas.offsetHeight - 40),
      }
      setOnis((prevOnis) => [...prevOnis, newOni])
    }, 1000)

    return () => clearInterval(interval)
  }, [canvasRef, setOnis])

  return (
    <>
      {onis.map((oni) => (
        <div
          key={oni.id}
          className="absolute w-10 h-10 transform hover:scale-125 transition duration-200 ease-in-out"
          style={{
            left: `${oni.x}px`,
            top: `${oni.y}px`,
          }}
        >
          <img
            src="/assets/icons/oni.svg"
            alt="Oni"
            className="w-full h-full"
          />
        </div>
      ))}
    </>
  )
}
