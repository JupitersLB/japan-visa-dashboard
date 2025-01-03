import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { ImmigrationResponse } from '@/utils/types'
import { calculateInsights } from '@/utils/insightEngine'
import { getCachedData } from '@/utils/cacheHelper'
import { isPresent } from '@/utils/isPresent'

export async function POST(req: NextRequest) {
  const requestData = await req.json().catch(() => null)

  if (!requestData) {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 })
  }

  const {
    location = 'total',
    application_type,
    processing_category,
    from,
    to,
  } = requestData

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

  // Use the first entry as the latest date
  const latestEntry = data[0]
  const toDate = to || latestEntry?.date

  const fromDate = from || DateTime.fromISO(toDate).minus({ years: 1 }).toISO()

  if (
    !DateTime.fromISO(toDate).isValid ||
    !DateTime.fromISO(fromDate).isValid
  ) {
    return NextResponse.json(
      { message: 'Invalid date format for "from" or "to".' },
      { status: 400 }
    )
  }

  const groupedData = data.reduce(
    (
      acc: Record<string, Record<string, ImmigrationResponse[]>>,
      entry: ImmigrationResponse
    ) => {
      const entryDate = DateTime.fromISO(entry.date)

      if (
        entry.location === location &&
        (!application_type || entry.application_type === application_type) &&
        (!processing_category ||
          entry.processing_category === processing_category) &&
        entryDate >= DateTime.fromISO(fromDate) &&
        entryDate <= DateTime.fromISO(toDate)
      ) {
        if (!acc[entry.application_type]) {
          acc[entry.application_type] = {}
        }

        if (!acc[entry.application_type][entry.processing_category]) {
          acc[entry.application_type][entry.processing_category] = []
        }

        acc[entry.application_type][entry.processing_category].push(entry)
      }

      return acc
    },
    {} as Record<string, Record<string, ImmigrationResponse[]>>
  )

  return NextResponse.json(calculateInsights(groupedData))
}
