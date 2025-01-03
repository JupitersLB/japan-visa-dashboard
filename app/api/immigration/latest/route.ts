import { NextResponse } from 'next/server'
import { ImmigrationResponse } from '@/utils/types'
import { getCachedData } from '@/utils/cacheHelper'
import { isPresent } from '@/utils/isPresent'

export async function GET() {
  let data: ImmigrationResponse[] | null = null

  try {
    data = await getCachedData()
  } catch (error) {
    return NextResponse.json(
      { message: 'Error reading the data file.' },
      { status: 500 }
    )
  }

  if (!isPresent(data)) {
    return NextResponse.json(
      { message: 'Data file not found.' },
      { status: 404 }
    )
  }

  return NextResponse.json(data[0])
}
