import { FC } from 'react'

export const ErrorMessage: FC = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center">
    <h1 className="text-primary text-[10rem] font-extrabold">500</h1>
    <h2 className="text-neutral text-2xl mb-4">
      Internal Server Error. Something went wrong.
    </h2>
    <p className="text-foreground text-lg">
      Don&apos;t worry, we&apos;ve been notified. In the meantime, help us catch
      some mischievous Oni! 👹
    </p>
  </div>
)
