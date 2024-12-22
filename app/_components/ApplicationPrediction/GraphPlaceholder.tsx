import { FC } from 'react'

export const GraphPlaceholder: FC = () => (
  <div className="flex h-full w-full flex-col items-center justify-center bg-neutral rounded-lg">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="150"
      viewBox="0 0 200 150"
      fill="none"
      className="text-primary"
    >
      <line
        x1="20"
        y1="130"
        x2="20"
        y2="10"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="20"
        y1="130"
        x2="180"
        y2="130"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="20"
        y1="50"
        x2="180"
        y2="50"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4"
      />
      <line
        x1="20"
        y1="90"
        x2="180"
        y2="90"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4"
      />

      <polyline
        points="20,20 60,50 100,90 140,110 180,130"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="20" cy="20" r="4" fill="currentColor" />
      <circle cx="60" cy="50" r="4" fill="currentColor" />
      <circle cx="100" cy="90" r="4" fill="currentColor" />
      <circle cx="140" cy="110" r="4" fill="currentColor" />
      <circle cx="180" cy="130" r="4" fill="currentColor" />
    </svg>
    <p className="text-foreground mt-4 text-lg">
      Submit the form to see the chart
    </p>
  </div>
)
