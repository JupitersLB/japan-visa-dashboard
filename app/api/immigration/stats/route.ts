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
  const toDateObj = DateTime.fromISO(toDate)
  const fromDateObj = DateTime.fromISO(fromDate)

  if (!toDateObj.isValid || !fromDateObj.isValid) {
    return NextResponse.json(
      { message: 'Invalid date format.' },
      { status: 400 }
    )
  }

  const filteredData = data.filter((entry) => {
    const entryDate = DateTime.fromISO(entry.date)

    return (
      entry.location === location &&
      (!application_type || entry.application_type === application_type) &&
      (!processing_category ||
        entry.processing_category === processing_category) &&
      entryDate >= fromDateObj &&
      entryDate <= toDateObj
    )
  })

  return NextResponse.json(calculateInsights(filteredData))
}
