import React, { FC } from 'react'
import { JBChart } from '../graphing/JBChart'
import { GraphPlaceholder } from './GraphPlaceholder'
import { isPresent } from '@/utils/isPresent'
import { TooltipComponentFormatterCallbackParams } from 'echarts'
import { colors } from '@/utils/tailwind'
import { IBurnDownHash, PredictedData } from '@/utils/types'

type TooltipSeriesParam = Extract<
  TooltipComponentFormatterCallbackParams,
  readonly unknown[]
>[number]

type EncodedTooltipSeriesParam = TooltipSeriesParam & {
  encode?: {
    y?: Array<keyof IBurnDownHash | number>
  }
}

const getTooltipValue = (
  data: IBurnDownHash,
  param: EncodedTooltipSeriesParam
) => {
  const yKey = param.encode?.y?.[0]
  if (typeof yKey !== 'string') return null

  return data[yKey]
}

const formatTooltip = (params: TooltipComponentFormatterCallbackParams) => {
  if (!Array.isArray(params)) return ''
  // Safely handle the value extraction
  const value = params[0]?.value
  if (typeof value !== 'object' || value === null) return ''

  const data = value as IBurnDownHash
  const rows = params.reduce((acc: string[], cur) => {
    const seriesValue = getTooltipValue(data, cur as EncodedTooltipSeriesParam)
    if (!isPresent(seriesValue) || typeof seriesValue !== 'number') return acc

    acc.push(
      `<div style="color: ${cur.color};">${cur.marker} ${
        cur.seriesName
      }: ${seriesValue.toFixed()}</div>`
    )
    return acc
  }, [])
  return `<div>${data.month}</div>${rows.join('')}`
}

export const BurnDownChart: FC<{
  burnDownData: PredictedData['burnDownData']
}> = ({ burnDownData }) => {
  if (!burnDownData || burnDownData.length === 0) {
    return <GraphPlaceholder />
  }

  return (
    <div className="w-full h-full">
      <JBChart
        dataset={{
          source: burnDownData,
        }}
        tooltip={{
          trigger: 'axis',
          backgroundColor: colors.background.DEFAULT,
          borderColor: 'none',
          textStyle: {
            color: colors.foreground.DEFAULT,
          },
          formatter: formatTooltip,
        }}
        grid={{
          top: 20,
          bottom: 60,
          left: 50,
          right: 50,
        }}
        legend={{
          type: 'plain',
          textStyle: {
            color: colors.foreground.DEFAULT,
            fontSize: 12,
          },
          itemWidth: 16,
          itemHeight: 10,
          selectedMode: false,
        }}
        series={[
          {
            type: 'line',
            name: 'Remaining',
            smooth: false,
            showSymbol: true,
            symbol: 'circle',
            encode: { x: 'month', y: 'remainingActual' },
            lineStyle: {
              color: colors.primary.DEFAULT,
              width: 2,
            },
            itemStyle: {
              color: colors.primary.DEFAULT,
            },
          },
          {
            type: 'line',
            name: 'Predicted Average',
            smooth: true,
            showSymbol: false,
            symbol: 'circle',
            encode: { x: 'month', y: 'remainingAveragePredictedBurn' },
            lineStyle: {
              color: colors.primary.light,
              width: 2,
              type: 'dashed',
            },
            itemStyle: {
              color: colors.primary.light,
            },
          },
          {
            type: 'line',
            name: 'Predicted Weighted',
            smooth: true,
            showSymbol: false,
            symbol: 'circle',
            encode: { x: 'month', y: 'remainingWeightedPredictedBurn' },
            lineStyle: {
              color: colors.primary.dark,
              width: 2,
              type: 'dashed',
            },
            itemStyle: {
              color: colors.primary.dark,
            },
          },
        ]}
        xAxis={{
          type: 'category',
          boundaryGap: false,
          nameGap: 10,
          nameTextStyle: {
            color: 'var(--foreground)',
            verticalAlign: 'middle',
          },
          axisLabel: {
            fontWeight: 'lighter',
            color: colors.foreground.DEFAULT,
          },
          axisTick: {
            show: false,
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: colors.neutral.DEFAULT,
            },
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: colors.secondary.DEFAULT,
              type: 'dashed',
            },
          },
        }}
        yAxis={{
          type: 'value',
          nameGap: 40,
          nameTextStyle: {
            color: colors.foreground.DEFAULT,
            align: 'right',
            padding: [10, 10, 0, 0],
          },
          splitLine: {
            lineStyle: {
              color: colors.secondary.DEFAULT,
              type: 'dashed',
            },
          },
          axisTick: {
            show: false,
          },
          axisLine: {
            show: false,
          },
          axisLabel: {
            color: colors.foreground.DEFAULT,
            fontWeight: 'lighter',
          },
        }}
        media={[
          {
            query: { maxWidth: 500 },
            option: {
              legend: {
                orient: 'horizontal',
                bottom: 10,
                left: 'center',
              },
              grid: {
                bottom: 100,
              },
            },
          },
          {
            query: { minWidth: 501 },
            option: {
              legend: {
                orient: 'horizontal',
                bottom: 10,
                left: 'center',
              },
              grid: {
                bottom: 60,
              },
            },
          },
        ]}
      />
    </div>
  )
}
