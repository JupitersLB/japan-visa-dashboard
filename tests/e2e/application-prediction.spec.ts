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

test('loads the prediction form with mocked metadata', async ({ page }) => {
  await mockApiResponses(page)

  await page.goto('/')

  await expect(page.getByText('Location')).toBeVisible()
  await expect(page.getByText('Application Type')).toBeVisible()
  await expect(page.getByText('Submission Date')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible()
  await expect(page.getByText('Submit the form to see the chart')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Estimation' })).toBeVisible()
  await expect(page.getByText('-')).toBeVisible()
})

test('submits the default prediction request and renders results', async ({
  page,
}) => {
  const { predictionRequests } = await mockApiResponses(page)

  await page.goto('/')
  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page.getByText('April 2025 - May 2025')).toBeVisible()
  await expect(page.getByText('Submit the form to see the chart')).toBeHidden()
  await expect(page.locator('canvas')).toHaveCount(1)

  expect(predictionRequests).toHaveLength(1)
  const request = predictionRequests[0]
  expect(request.searchParams.get('location')).toBe('tokyo')
  expect(request.searchParams.get('application_type')).toBe(
    'permanent_residence'
  )
  expect(request.searchParams.get('submitted_from')).toBeTruthy()
})

test('uses changed select values in the prediction request', async ({ page }) => {
  const { predictionRequests } = await mockApiResponses(page)

  await page.goto('/')

  await page.getByLabel('Location').click()
  await page.getByRole('option', { name: 'Osaka' }).click()

  await page.getByLabel('Application Type').click()
  await page.getByRole('option', { name: 'Extension' }).click()

  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('April 2025 - May 2025')).toBeVisible()

  expect(predictionRequests).toHaveLength(1)
  const request = predictionRequests[0]
  expect(request.searchParams.get('location')).toBe('osaka')
  expect(request.searchParams.get('application_type')).toBe('extension')
})
