import { promises as fs } from 'fs'
import path from 'path'
import { DateTime } from 'luxon'
import { ImmigrationResponse } from './types'

let cachedData: ImmigrationResponse[] | null = null
let lastCacheTime: DateTime | null = null
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

const filePath = path.join(process.cwd(), 'data', 'immigration_data.json')

export const getCachedData = () => {
  const currentTime = DateTime.now()

  // If cache is still valid, return cached data
  if (cachedData !== null && lastCacheTime !== null) {
    const timeDifference = currentTime.diff(
      lastCacheTime,
      'milliseconds'
    ).milliseconds

    if (timeDifference < CACHE_EXPIRATION_TIME) {
      return Promise.resolve(cachedData)
    }
  }

  return fs
    .readFile(filePath, 'utf8')
    .then((data) => {
      cachedData = JSON.parse(data).data
      lastCacheTime = currentTime
      return cachedData
    })
    .catch(() => Promise.reject('Error reading the file'))
}
