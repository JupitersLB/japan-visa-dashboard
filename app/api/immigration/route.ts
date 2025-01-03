import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { getCachedData } from '@/utils/cacheHelper'
import { ImmigrationResponse } from '@/utils/types'
import { isPresent } from '@/utils/isPresent'

export async function POST(req: NextRequest) {
  const { location, application_type, processing_category, from } = await req
    .json()
    .catch(() => {
      return NextResponse.json(
        { message: 'Invalid JSON body.' },
        { status: 400 }
      )
    })

  if (from && !DateTime.fromISO(from).isValid) {
    return NextResponse.json(
      {
        message: 'Invalid date format for "from". Use ISO format (YYYY-MM-DD).',
      },
      { status: 400 }
    )
  }

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

  const filteredData = data.reduce((result: any[], entry: any) => {
    if (location && entry.location !== location) return result
    if (application_type && entry.application_type !== application_type)
      return result
    if (
      processing_category &&
      entry.processing_category !== processing_category
    )
      return result

    if (from) {
      const entryDate = DateTime.fromISO(entry.date)
      if (!entryDate.isValid || entryDate < DateTime.fromISO(from))
        return result
    }

    result.push(entry)
    return result
  }, [])

  return NextResponse.json(filteredData)
}
