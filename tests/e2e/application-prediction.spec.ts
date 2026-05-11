import { expect, test, type Page } from '@playwright/test'
import { applyApiHar } from './support/apiHar'

const latestMetadataResponse = {
  latest_month: '2025-03',
  latest_date: '2025-03-01T00:00:00+09:00',
  row_count: 1234,
}

const predictionResponse = {
  filters: {
    location: 'tokyo',
    application_type: 'permanent_residence',
    submitted_from: '2025-01-01T00:00:00.000+09:00',
    stats_from: '2024-01',
    stats_to: '2025-03',
  },
  burn_down_data: [
    {
      month: '2025-01',
      remaining_actual: 100,
      remaining_average_predicted_burn: 100,
      remaining_weighted_predicted_burn: 100,
    },
    {
      month: '2025-02',
      remaining_actual: 60,
      remaining_average_predicted_burn: 55,
      remaining_weighted_predicted_burn: 50,
    },
    {
      month: '2025-03',
      remaining_actual: 20,
      remaining_average_predicted_burn: 10,
      remaining_weighted_predicted_burn: 5,
    },
  ],
  predicted_zero_month_average: '2025-04',
  predicted_zero_month_weighted: '2025-05',
  monthly_average: 40,
  monthly_weighted: 45,
}

type PredictionResponse = typeof predictionResponse

const mockApiResponses = async (
  page: Page,
  prediction: PredictionResponse = predictionResponse
) => {
  const predictionRequests: URL[] = []

  await page.route('**/api/meta/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(latestMetadataResponse),
    })
  })

  await page.route('**/api/predictions**', async (route) => {
    predictionRequests.push(new URL(route.request().url()))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(prediction),
    })
  })

  return { predictionRequests }
}

const openPredictionPage = async (
  page: Page,
  prediction?: PredictionResponse
) => {
  const api = await mockApiResponses(page, prediction)
  await page.goto('/')
  return api
}

const openPredictionPageWithHar = async (page: Page, name: string) => {
  await applyApiHar(page, name)
  await page.goto('/')
}

const submitPrediction = async (
  page: Page,
  expectedEstimation: string | RegExp = 'April 2025 - May 2025'
) => {
  const predictionRequest = page.waitForRequest('**/api/predictions**')

  await page.getByTestId('prediction-submit').click()
  await expect(page.getByTestId('prediction-estimation-value')).toHaveText(
    expectedEstimation
  )

  return new URL((await predictionRequest).url())
}

const recordedEstimationPattern = /^[A-Z][a-z]+ \d{4}(?: - [A-Z][a-z]+ \d{4})?$/

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T12:00:00+09:00'))
})

const expectPredictionRequest = (
  request: URL,
  expected: { location: string; applicationType: string }
) => {
  expect(request.searchParams.get('location')).toBe(expected.location)
  expect(request.searchParams.get('application_type')).toBe(
    expected.applicationType
  )
  expect(request.searchParams.get('submitted_from')).toBeTruthy()
}

test('loads the prediction form with mocked metadata', async ({ page }) => {
  await openPredictionPage(page)

  await expect(page.getByTestId('location-select')).toBeVisible()
  await expect(page.getByTestId('application-type-select')).toBeVisible()
  await expect(page.getByTestId('submission-date-input')).toBeVisible()
  await expect(page.getByTestId('prediction-submit')).toBeVisible()
  await expect(page.getByTestId('prediction-chart-placeholder')).toBeVisible()
  await expect(page.getByTestId('prediction-estimation')).toBeVisible()
  await expect(page.getByTestId('prediction-estimation-value')).toHaveText('-')
})

test('submits the default prediction request and renders results @har:prediction-default', async ({
  page,
}) => {
  await openPredictionPageWithHar(page, 'prediction-default')

  const predictionRequest = await submitPrediction(
    page,
    recordedEstimationPattern
  )
  await expect(page.getByTestId('prediction-chart-placeholder')).toBeHidden()
  await expect(
    page.getByTestId('prediction-chart').locator('canvas')
  ).toHaveCount(1)

  expectPredictionRequest(predictionRequest, {
    location: 'tokyo',
    applicationType: 'permanent_residence',
  })
})

test('uses changed select values in the prediction request @har:prediction-osaka-extension', async ({
  page,
}) => {
  await openPredictionPageWithHar(page, 'prediction-osaka-extension')

  await page.getByTestId('location-select').click()
  await page.getByTestId('location-option-osaka').click()

  await page.getByTestId('application-type-select').click()
  await page.getByTestId('application_type-option-extension').click()

  const predictionRequest = await submitPrediction(
    page,
    recordedEstimationPattern
  )

  expectPredictionRequest(predictionRequest, {
    location: 'osaka',
    applicationType: 'extension',
  })
})

test('keeps the placeholder for a successful prediction with no chart data', async ({
  page,
}) => {
  const emptyPredictionResponse: PredictionResponse = {
    ...predictionResponse,
    burn_down_data: [],
    predicted_zero_month_average: null,
    predicted_zero_month_weighted: null,
  }
  const { predictionRequests } = await openPredictionPage(
    page,
    emptyPredictionResponse
  )

  await submitPrediction(page, '-')

  await expect(page.getByTestId('prediction-chart-placeholder')).toBeVisible()
  await expect(page.getByTestId('prediction-chart')).toBeHidden()
  expect(predictionRequests).toHaveLength(1)
})

test('shows an inline error when the prediction request times out', async ({
  page,
}) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))

  await page.route('**/api/meta/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(latestMetadataResponse),
    })
  })

  await page.route('**/api/predictions**', async (route) => {
    await route.fulfill({
      status: 504,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: {
          code: 'backend_proxy_timeout',
        },
      }),
    })
  })

  await page.goto('/')
  await page.getByTestId('prediction-submit').click()

  await expect(page.getByTestId('prediction-error')).toHaveText(
    'The prediction request timed out. Please try again.'
  )
  await expect(page.getByTestId('prediction-estimation-value')).toHaveText('-')
  expect(pageErrors).toEqual([])
})

test('renders one estimation month when average and weighted predictions match', async ({
  page,
}) => {
  const sameMonthPredictionResponse: PredictionResponse = {
    ...predictionResponse,
    predicted_zero_month_average: '2025-04',
    predicted_zero_month_weighted: '2025-04',
  }

  await openPredictionPage(page, sameMonthPredictionResponse)
  await submitPrediction(page, 'April 2025')
})
