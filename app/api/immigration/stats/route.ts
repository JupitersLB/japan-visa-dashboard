import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { DateTime } from 'luxon'
import { ImmigrationResponse } from '@/utils/types'
import { calculateInsights } from '@/utils/insightEngine'

export async function POST(req: NextRequest) {
  // Resolve the file path
  const filePath = path.join(process.cwd(), 'data', 'immigration_data.json')

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { message: 'Data file not found.' },
      { status: 404 }
    )
  }

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

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  // Use the first entry as the latest date
  const latestEntry = data[0]
  const toDate = to || latestEntry?.date

  // Set default `from` as one year before `to`
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

      // Apply the filter criteria
      if (
        entry.location === location &&
        (!application_type || entry.application_type === application_type) &&
        (!processing_category ||
          entry.processing_category === processing_category) &&
        entryDate >= DateTime.fromISO(fromDate) &&
        entryDate <= DateTime.fromISO(toDate)
      ) {
        // Initialize group for application_type if it doesn't exist
        if (!acc[entry.application_type]) {
          acc[entry.application_type] = {}
        }

        // Initialize group for processing_category if it doesn't exist
        if (!acc[entry.application_type][entry.processing_category]) {
          acc[entry.application_type][entry.processing_category] = []
        }

        // Add the entry to the respective group
        acc[entry.application_type][entry.processing_category].push(entry)
      }

      return acc
    },
    {} as Record<string, Record<string, ImmigrationResponse[]>>
  )

  return NextResponse.json(calculateInsights(groupedData))
}
