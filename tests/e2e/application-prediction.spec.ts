import { expect, test, type Page } from '@playwright/test'

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

const mockApiResponses = async (page: Page) => {
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
      body: JSON.stringify(predictionResponse),
    })
  })

  return { predictionRequests }
}

const openPredictionPage = async (page: Page) => {
  const api = await mockApiResponses(page)
  await page.goto('/')
  return api
}

const submitPrediction = async (page: Page) => {
  await page.getByTestId('prediction-submit').click()
  await expect(page.getByTestId('prediction-estimation-value')).toHaveText(
    'April 2025 - May 2025'
  )
}

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

test('submits the default prediction request and renders results', async ({
  page,
}) => {
  const { predictionRequests } = await openPredictionPage(page)

  await submitPrediction(page)
  await expect(page.getByTestId('prediction-chart-placeholder')).toBeHidden()
  await expect(
    page.getByTestId('prediction-chart').locator('canvas')
  ).toHaveCount(1)

  expect(predictionRequests).toHaveLength(1)
  expectPredictionRequest(predictionRequests[0], {
    location: 'tokyo',
    applicationType: 'permanent_residence',
  })
})

test('uses changed select values in the prediction request', async ({ page }) => {
  const { predictionRequests } = await openPredictionPage(page)

  await page.getByTestId('location-select').click()
  await page.getByTestId('location-option-osaka').click()

  await page.getByTestId('application-type-select').click()
  await page.getByTestId('application_type-option-extension').click()

  await submitPrediction(page)

  expect(predictionRequests).toHaveLength(1)
  expectPredictionRequest(predictionRequests[0], {
    location: 'osaka',
    applicationType: 'extension',
  })
})
