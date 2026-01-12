import React, { useMemo, useRef, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import useLineChartData from "../hooks/useDashboardData";
import { isSameLocalDay } from "../../../utils/dateUtils";

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

function getAggregationKey(ts, rangeMs) {
  const date = new Date(ts);
  if (rangeMs <= 24 * 60 * 60 * 1000) return date.getHours();
  if (rangeMs <= 7 * 24 * 60 * 60 * 1000) return date.toLocaleDateString("en-CA");
  if (rangeMs <= 30 * 24 * 60 * 60 * 1000) {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return startOfWeek.toLocaleDateString("en-CA");
  }
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

export default function DashboardLineChart({ filters }) {
  const { lineChart, loading, error } = useLineChartData(filters);
  const lastLineChartRef = useRef(lineChart);

  useEffect(() => {
    if (!loading && !error) lastLineChartRef.current = lineChart;
  }, [lineChart, loading, error]);

  const chartData = !loading && error ? lastLineChartRef.current : lineChart;

  const { startDate, endDate } = filters;
  const rangeMs = endDate - startDate;
  const isOneDayRange = rangeMs <= 24 * 60 * 60 * 1000;

  const { livePoints, forecastPoints, minX, maxX } = useMemo(() => {
    if (!chartData?.labels?.length)
      return { livePoints: [], forecastPoints: [], minX: startDate, maxX: endDate };

    const filtered = chartData.labels
      .map((ts, i) => ({
        ts: new Date(ts),
        live: chartData.live[i],
        forecast: chartData.forecast[i],
      }))
      .filter(({ ts }) => ts >= startDate && ts <= endDate);

    if (!filtered.length)
      return { livePoints: [], forecastPoints: [], minX: startDate, maxX: endDate };

    let livePointsArr = [];
    let forecastPointsArr = [];

    if (isOneDayRange) {
      livePointsArr = filtered
        .filter((p) => p.live != null && !isNaN(p.live))
        .map((p) => ({ x: p.ts, y: p.live }));
      forecastPointsArr = filtered
        .filter((p) => p.forecast != null && !isNaN(p.forecast))
        .map((p) => ({ x: p.ts, y: p.forecast }));
    } else {
      const aggMap = {};
      filtered.forEach(({ ts, live, forecast }) => {
        const key = getAggregationKey(ts, rangeMs);
        if (!aggMap[key]) aggMap[key] = { live: 0, forecast: 0, count: 0 };
        aggMap[key].live += live || 0;
        aggMap[key].forecast += forecast || 0;
        aggMap[key].count += 1;
      });

      const sortedKeys = Object.keys(aggMap).sort();
      livePointsArr = sortedKeys.map((k) => ({
        x:
          rangeMs > 30 * 24 * 60 * 60 * 1000
            ? new Date(k + "-01")
            : new Date(k + "T00:00:00"),
        y: aggMap[k].live / aggMap[k].count,
      }));
      forecastPointsArr = sortedKeys.map((k) => ({
        x:
          rangeMs > 30 * 24 * 60 * 60 * 1000
            ? new Date(k + "-01")
            : new Date(k + "T00:00:00"),
        y: aggMap[k].forecast / aggMap[k].count,
      }));
    }

    const allPoints = [...livePointsArr, ...forecastPointsArr];
    const minXVal = allPoints.length ? allPoints[0].x : startDate;
    const maxXVal = allPoints.length ? allPoints[allPoints.length - 1].x : endDate;

    return {
      livePoints: livePointsArr,
      forecastPoints: forecastPointsArr,
      minX: minXVal,
      maxX: maxXVal,
    };
  }, [chartData, startDate, endDate, rangeMs, isOneDayRange]);

  const showRealtime =
    chartData.realtime &&
    ((isOneDayRange && isSameLocalDay(startDate, new Date())) ||
      (!isOneDayRange && isSameLocalDay(endDate, new Date())));

  const realtimePoint = showRealtime
    ? [
        {
          x: chartData.realtime?.timestamp
            ? new Date(chartData.realtime.timestamp)
            : new Date(),
          y: chartData.realtime?.value ?? 0,
        },
      ]
    : [];

  const data = {
    datasets: [
      {
        label: "Live Power",
        data: livePoints,
        borderColor: "rgba(126, 34, 206, 0.9)",
        backgroundColor: function (ctx) {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(126, 34, 206, 0.3)");
          gradient.addColorStop(1, "rgba(126, 34, 206, 0)");
          return gradient;
        },
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 2,
        clip: false,
      },
      {
        label: "Forecast",
        data: forecastPoints,
        borderColor: "rgba(14, 165, 233, 0.9)",
        backgroundColor: function (ctx) {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(14, 165, 233, 0.3)");
          gradient.addColorStop(1, "rgba(14, 165, 233, 0)");
          return gradient;
        },
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        borderDash: [5, 5],
        pointRadius: 2,
        clip: false,
      },
      {
        label: "Realtime",
        data: realtimePoint,
        borderColor: "rgba(239, 68, 68, 0.9)",
        backgroundColor: "rgba(239, 68, 68, 0.5)",
        pointRadius: 5,
        pointStyle: "circle",
        showLine: false,
        clip: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", axis: "x", intersect: false },
    plugins: {
      title: {
        display: true,
        text: "Live vs Forecast Power",
        font: { size: 20, weight: "600" },
      },
      legend: {
        position: "top",
        labels: { usePointStyle: true, padding: 15, boxWidth: 10, font: { size: 13 } },
      },
      tooltip: {
        mode: "nearest",
        intersect: false,
        backgroundColor: "#111827",
        titleColor: "#f9fafb",
        bodyColor: "#f9fafb",
        titleFont: { weight: "500" },
        callbacks: {
          label: function (tooltipItem) {
            const datasetLabel = tooltipItem.dataset.label;
            const timestamp = tooltipItem.raw?.x ?? tooltipItem.parsed?.x;

            if (datasetLabel === "Realtime") {
              const value = tooltipItem.raw?.y ?? tooltipItem.parsed?.y ?? 0;
              return `Live Realtime: ${Number(value).toFixed(2)}`;
            }

            const liveVal = data.datasets[0].data.find((p) => +p.x === +timestamp)?.y;
            const forecastVal = data.datasets[1].data.find((p) => +p.x === +timestamp)?.y;

            // Only show one if hovering a single line, both if hovering on vertical
            if (tooltipItem.dataset.label === "Forecast" && forecastVal != null) {
              return `Forecast: ${Number(forecastVal).toFixed(2)}`;
            }
            if (tooltipItem.dataset.label === "Live Power" && liveVal != null) {
              return `Live Power: ${Number(liveVal).toFixed(2)}`;
            }

            if (liveVal != null && forecastVal != null) {
              return [
                `Live Power: ${Number(liveVal).toFixed(2)}`,
                `Forecast: ${Number(forecastVal).toFixed(2)}`,
              ];
            }

            return null;
          },
          filter: function (tooltipItem) {
            // Show only the hovered line unless hovering vertical shared tooltip
            const dataset = tooltipItem.dataset;
            if (!tooltipItem.label) return false; // safeguard
            const shared = tooltipItem.chart.tooltip._active.length > 1;
            if (shared) return true; // vertical line, show both
            return true; // single line, handled in label callback
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: isOneDayRange
            ? "hour"
            : rangeMs <= 7 * 24 * 60 * 60 * 1000
            ? "day"
            : rangeMs <= 30 * 24 * 60 * 60 * 1000
            ? "week"
            : "month",
          tooltipFormat: isOneDayRange ? "HH:mm" : "yyyy-MM-dd",
        },
        min: minX,
        max: maxX,
        bounds: "ticks",
        offset: false,
        grid: { color: "#f3f4f6", drawTicks: false },
        ticks: { font: { size: 12 }, color: "#4b5563" },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Power (kW)",
          color: "#374151",
          font: { weight: "500", size: 13 },
        },
        grid: { color: "#f3f4f6", drawTicks: false },
        ticks: { font: { size: 12 }, color: "#4b5563" },
      },
    },
  };

  if (loading)
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-80 bg-gray-100 rounded"></div>
      </div>
    );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <div className="h-[480px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
