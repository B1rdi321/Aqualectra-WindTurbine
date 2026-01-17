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

export default function DashboardLineChart({
  filters,
  lineChart,
  lineChartPerTurbine,
  showPerTurbine,
  setShowPerTurbine,
}) {
  const lastLineChartRef = useRef(lineChart);
  const lastLineChartPerTurbineRef = useRef(lineChartPerTurbine);

  useEffect(() => {
    if (!showPerTurbine) lastLineChartRef.current = lineChart;
    else lastLineChartPerTurbineRef.current = lineChartPerTurbine;
  }, [lineChart, lineChartPerTurbine, showPerTurbine]);

  const chartData = showPerTurbine
    ? lineChartPerTurbine || lastLineChartPerTurbineRef.current
    : lineChart || lastLineChartRef.current;

  const { startDate, endDate } = filters;
  const rangeMs = endDate - startDate;
  const isOneDayRange = rangeMs <= 24 * 60 * 60 * 1000;

  // ---------------- Build datasets ----------------
  const datasets = useMemo(() => {
    if (!chartData) return [];

    const labels = chartData.labels || [];

    if (!showPerTurbine) {
      // Aggregated chart
      const filtered = labels
        .map((ts, i) => ({
          ts: new Date(ts),
          live: chartData.live[i],
          forecast: chartData.forecast[i],
        }))
        .filter(({ ts }) => ts >= startDate && ts <= endDate);

      const livePoints = filtered
        .filter((p) => p.live != null)
        .map((p) => ({ x: p.ts, y: p.live }));

      const forecastPoints = filtered
        .filter((p) => p.forecast != null)
        .map((p) => ({ x: p.ts, y: p.forecast }));

      const realtimePoints =
        chartData.realtime &&
        ((isOneDayRange && isSameLocalDay(startDate, new Date())) ||
          (!isOneDayRange && isSameLocalDay(endDate, new Date())))
          ? [{ x: new Date(chartData.realtime.timestamp), y: chartData.realtime.value }]
          : [];

      return [
        {
          label: "Live Power",
          data: livePoints,
          borderColor: "rgba(126,34,206,0.9)",
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, "rgba(126,34,206,0.3)");
            g.addColorStop(1, "rgba(126,34,206,0)");
            return g;
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
          borderColor: "rgba(14,165,233,0.9)",
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, "rgba(14,165,233,0.3)");
            g.addColorStop(1, "rgba(14,165,233,0)");
            return g;
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
          data: realtimePoints,
          borderColor: "rgba(239,68,68,0.9)",
          backgroundColor: "rgba(239,68,68,0.5)",
          pointRadius: 5,
          showLine: false,
          clip: false,
        },
      ];
    } else {
      // ---------------- Per-turbine chart ----------------
      return Object.entries(chartData.turbines || {}).map(([tId, series], idx) => {
        const livePoints = series.live
          .map((val, i) => {
            if (val == null) return null;
            const ts = new Date(labels[i]);
            if (ts < startDate || ts > endDate) return null;
            return { x: ts, y: val };
          })
          .filter(Boolean);

        const forecastPoints = series.forecast
          .map((val, i) => {
            if (val == null) return null;
            const ts = new Date(labels[i]);
            if (ts < startDate || ts > endDate) return null;
            return { x: ts, y: val };
          })
          .filter(Boolean);

        const colorHue = (idx * 50) % 360;
        return [
          {
            label: `Turbine ${tId} Live`,
            data: livePoints,
            borderColor: `hsl(${colorHue},80%,50%)`,
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            pointRadius: 2,
            pointStyle: "circle",
            clip: false,
          },
          {
            label: `Turbine ${tId} Forecast`,
            data: forecastPoints,
            borderColor: `hsl(${colorHue},50%,50%)`,
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            borderDash: [5, 5],
            pointRadius: 2,
            pointStyle: "circle",
            clip: false,
          },
        ];
      }).flat();
    }
  }, [chartData, startDate, endDate, isOneDayRange, showPerTurbine]);

  const data = { datasets };

  // ---------------- Chart options with dynamic resolution ----------------
  let timeUnit;
  if (rangeMs <= 7 * 24 * 60 * 60 * 1000) timeUnit = "hour";
  else if (rangeMs <= 30 * 24 * 60 * 60 * 1000) timeUnit = "day";
  else if (rangeMs <= 180 * 24 * 60 * 60 * 1000) timeUnit = "week";
  else if (rangeMs <= 730 * 24 * 60 * 60 * 1000) timeUnit = "month";
  else timeUnit = "year";

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", axis: "x", intersect: false },
    plugins: {
      title: {
        display: true,
        text: showPerTurbine ? "Per-Turbine Power" : "Live vs Forecast Power",
        font: { size: 20, weight: "600" },
      },
      legend: {
        position: "top",
        labels: { usePointStyle: true, padding: 15, boxWidth: 10, font: { size: 13 } },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: timeUnit,
          tooltipFormat: timeUnit === "hour" ? "HH:mm" : "yyyy-MM-dd",
        },
        min: startDate,
        max: endDate,
        bounds: "ticks",
        grid: { color: "#f3f4f6", drawTicks: false },
        ticks: { font: { size: 12 }, color: "#4b5563" },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "Power (kW)", color: "#374151", font: { weight: "500", size: 13 } },
        grid: { color: "#f3f4f6", drawTicks: false },
        ticks: { font: { size: 12 }, color: "#4b5563" },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-lg">{showPerTurbine ? "Per-Turbine Chart" : "Aggregated Chart"}</h2>
        <div className="flex items-center space-x-3">
          <span className={`text-sm font-medium ${!showPerTurbine ? "text-gray-800" : "text-gray-400"}`}>Aggregated</span>
          <div
            className={`relative w-14 h-8 rounded-full cursor-pointer transition-all duration-300 ${showPerTurbine ? "bg-indigo-600" : "bg-gray-300"}`}
            onClick={() => setShowPerTurbine(!showPerTurbine)}
          >
            <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${showPerTurbine ? "translate-x-6" : "translate-x-0"}`} />
          </div>
          <span className={`text-sm font-medium ${showPerTurbine ? "text-gray-800" : "text-gray-400"}`}>Per-Turbine</span>
        </div>
      </div>

      <div className="h-[480px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
