import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { DateTime } from 'luxon'

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

  // Parse the request body
  const { location, application_type, processing_category, from } = await req
    .json()
    .catch(() => {
      return NextResponse.json(
        { message: 'Invalid JSON body.' },
        { status: 400 }
      )
    })

  // Validate the `from` date
  if (from && !DateTime.fromISO(from).isValid) {
    return NextResponse.json(
      {
        message: 'Invalid date format for "from". Use ISO format (YYYY-MM-DD).',
      },
      { status: 400 }
    )
  }

  // Read and parse the data file
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  // Filter data using reduce
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

  // Return the filtered data
  return NextResponse.json(filteredData)
}
