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
import React, { useRef, FC, useEffect, useCallback } from 'react'

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

  // Initialize the chart
  useEffect(() => {
    if (chartRef.current && !chartInstanceRef.current) {
      const chart = echarts.init(chartRef.current)
      chartInstanceRef.current = chart

      // Initial option setup
      const initialOption: echarts.EChartsOption = {
        series,
        ...(dataset && { dataset }),
        ...(tooltip && { tooltip }),
        ...(dataZoom && { dataZoom }),
        ...(grid && { grid }),
        ...(xAxis && { xAxis }),
        ...(yAxis && { yAxis }),
        ...(legend && { legend }),
        ...(media && { media }),
      }

      chart.setOption(initialOption)

      return () => {
        chart.dispose()
        chartInstanceRef.current = null
      }
    }
  }, [chartRef.current])

  // Update chart options when props change
  useEffect(() => {
    const chart = chartInstanceRef.current
    if (chart) {
      const updatedOption: echarts.EChartsOption = {
        series,
        ...(dataset && { dataset }),
        ...(tooltip && { tooltip }),
        ...(dataZoom && { dataZoom }),
        ...(grid && { grid }),
        ...(xAxis && { xAxis }),
        ...(yAxis && { yAxis }),
        ...(legend && { legend }),
        ...(media && { media }),
      }

      chart.setOption(updatedOption)
    }
  }, [series, tooltip, dataZoom, grid, xAxis, yAxis, dataset, legend, media])

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
