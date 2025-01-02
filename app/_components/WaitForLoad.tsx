import { FC, ReactNode } from 'react'

export const WaitForLoad: FC<{
  isLoading: boolean
  loadingComponent: ReactNode
  children: ReactNode
}> = ({ isLoading, loadingComponent, children }) => {
  return isLoading ? loadingComponent : children
}
