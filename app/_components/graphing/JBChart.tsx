import * as echarts from 'echarts'
import type {
  SeriesOption,
  GridComponentOption,
  DataZoomComponentOption,
  TooltipComponentOption,
  XAXisComponentOption,
  YAXisComponentOption,
  LegendComponentOption,
  DatasetComponentOption,
} from 'echarts'
import React, { useRef, FC, useEffect, useCallback, useMemo } from 'react'

export const JBChart: FC<{
  series: SeriesOption | SeriesOption[]
  tooltip?: TooltipComponentOption
  dataZoom?: DataZoomComponentOption | DataZoomComponentOption[]
  grid?: GridComponentOption | GridComponentOption[]
  xAxis?: XAXisComponentOption | XAXisComponentOption[]
  yAxis?: YAXisComponentOption | YAXisComponentOption[]
  legend?: LegendComponentOption
  dataset?: DatasetComponentOption
  media?: echarts.EChartsCoreOption['media']
}> = ({
  series,
  tooltip,
  dataZoom,
  grid,
  xAxis,
  yAxis,
  dataset,
  legend,
  media,
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const chartOption = useMemo<echarts.EChartsOption>(
    () => ({
      series,
      ...(dataset && { dataset }),
      ...(tooltip && { tooltip }),
      ...(dataZoom && { dataZoom }),
      ...(grid && { grid }),
      ...(xAxis && { xAxis }),
      ...(yAxis && { yAxis }),
      ...(legend && { legend }),
      ...(media && { media }),
    }),
    [series, tooltip, dataZoom, grid, xAxis, yAxis, dataset, legend, media]
  )

  // Initialize the chart
  useEffect(() => {
    if (!chartRef.current) return

    const chart = echarts.init(chartRef.current)
    chartInstanceRef.current = chart

    return () => {
      chart.dispose()
      chartInstanceRef.current = null
    }
  }, [])

  // Update chart options when props change
  useEffect(() => {
    const chart = chartInstanceRef.current
    if (chart) {
      chart.setOption(chartOption)
    }
  }, [chartOption])

  // Handle window resize
  const handleResize = useCallback(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.resize()
    }
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize])

  return <div ref={chartRef} className="w-full h-full" />
}
