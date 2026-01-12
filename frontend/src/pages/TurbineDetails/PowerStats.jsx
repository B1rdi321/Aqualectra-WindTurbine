import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const InfoTooltip = React.memo(({ text }) => (
  <span className="relative group ml-1 cursor-pointer text-gray-400 text-sm">
    ⓘ
    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-52 text-xs text-white bg-gray-800 px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50">
      {text}
    </span>
  </span>
));

export default function PowerStats({ details }) {
  const stats = useMemo(() => {
    if (!details?.forecast?.length || !details?.realtime?.length) return null;

    const forecastValues = details.forecast
      .map(f => f.measurement)
      .filter(v => v != null);

    const realtimeValues = details.realtime
      .map(r => r.measurement)
      .filter(v => v != null);

    const avgForecast =
      forecastValues.reduce((a, b) => a + b, 0) / forecastValues.length;
    const avgRealtime =
      realtimeValues.reduce((a, b) => a + b, 0) / realtimeValues.length;

    const maxRealtime = Math.max(...realtimeValues);
    const minRealtime = Math.min(...realtimeValues);

    const diffPercent = ((avgRealtime - avgForecast) / avgForecast) * 100;

    return {
      avgForecast,
      avgRealtime,
      maxRealtime,
      minRealtime,
      diffPercent,
      excludedCount: details.realtime.length - realtimeValues.length,
    };
  }, [details]);

  const miniChartData = useMemo(() => {
    if (!details) return { labels: [], datasets: [] };

    const labels = details.realtime.map(r =>
      new Date(r.timestamp).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    return {
      labels,
      datasets: [
        {
          label: "Forecast",
          data: details.forecast.map(f => f.measurement),
          borderColor: "orange",
          backgroundColor: "rgba(255,165,0,0.3)",
          tension: 0.3,
          fill: false,
        },
        {
          label: "Realtime",
          data: details.realtime.map(r => r.measurement),
          borderColor: "blue",
          backgroundColor: "rgba(0,0,255,0.3)",
          tension: 0.3,
          fill: false,
        },
      ],
    };
  }, [details]);

  if (!stats) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <p className="text-gray-500 italic">Insufficient data for trend analysis.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 space-y-4">
      <h3 className="text-lg font-semibold text-blue-700">Power Statistics & Trends</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-500">Avg Forecast</p>
          <p className="text-xl font-bold text-blue-800">{stats.avgForecast.toFixed(2)} kW</p>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-500">Avg Realtime</p>
          <p className="text-xl font-bold text-blue-800">{stats.avgRealtime.toFixed(2)} kW</p>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-500 flex items-center">
            Diff %
            <InfoTooltip text="Shows how the average real-time output compares to the forecast. Positive means real-time was higher than forecast." />
          </p>
          <p className={`text-xl font-bold ${stats.diffPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
            {stats.diffPercent.toFixed(1)}%
          </p>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-500 flex items-center">
            Max Realtime
            <InfoTooltip text="The highest real-time power output recorded during the selected period." />
          </p>
          <p className="text-xl font-bold text-blue-800">{stats.maxRealtime.toFixed(2)} kW</p>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-500 flex items-center">
            Min Realtime {stats.excludedCount > 0 && "(pending data excluded)"}
            <InfoTooltip text="Lowest real-time power recorded, excluding missing/unupdated data." />
          </p>
          <p className="text-xl font-bold text-blue-800">{stats.minRealtime.toFixed(2)} kW</p>
        </div>
      </div>

      <div className="h-48">
        <Line
          data={miniChartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false } },
            elements: { point: { radius: 0 } },
          }}
        />
      </div>
    </div>
  );
}
