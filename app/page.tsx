import { ApplicationPrediction } from './_components/ApplicationPrediction'

export default function Home() {
  return (
    <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <ApplicationPrediction />
    </div>
  )
}
