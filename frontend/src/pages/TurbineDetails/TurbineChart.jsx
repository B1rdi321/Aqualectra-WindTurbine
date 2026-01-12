import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import annotationPlugin from "chartjs-plugin-annotation";
import "chartjs-adapter-date-fns";

ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin,
  annotationPlugin
);

export default function TurbineChart({
  chartRef,
  lineChartData,
  chartOptions,
  nowValues,
  isTodaySelected,
}) {
  const isMobile = window.innerWidth < 768;

  const mergedOptions = {
    ...chartOptions,
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      ...chartOptions.plugins,
      zoom: isMobile
        ? {
            pan: { enabled: true, mode: "x" },
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
          }
        : undefined,
    },
  };

  return (
    <div className="bg-white p-4 shadow rounded relative">
      <h3 className="text-lg font-semibold text-blue-700 mb-2">
        Real-time vs Forecast
      </h3>

      <div className="w-full h-64 md:h-96">
        <Line ref={chartRef} data={lineChartData} options={mergedOptions} />
      </div>

      {isTodaySelected && nowValues && (
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1.5 rounded-md shadow-md text-sm">
          <p className="font-semibold">Now</p>
          <p>Real-time: {nowValues.realtime} kW</p>
          <p>Forecast: {nowValues.forecast} kW</p>
        </div>
      )}
    </div>
  );
}