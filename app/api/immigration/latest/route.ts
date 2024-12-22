import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { ImmigrationResponse } from '@/utils/types'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'immigration_data.json')
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(fileContents) as ImmigrationResponse[]

    if (Array.isArray(data) && data.length > 0) {
      return NextResponse.json(data[0])
    }

    return NextResponse.json({ error: 'No data available.' }, { status: 404 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch newest date.' },
      { status: 500 }
    )
  }
}
