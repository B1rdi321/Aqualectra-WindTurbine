import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Small reusable tooltip ---
const InfoTooltip = ({ text }) => (
  <span className="relative group ml-1 cursor-pointer text-gray-400 text-sm select-none">
    ⓘ
    <span className="absolute right-0 top-6 w-56 text-xs text-white bg-gray-800 px-3 py-2 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50">
      {text}
    </span>
  </span>
);

export default function ForecastByLocationChart({ turbines = [], locationGroups = {}, loading }) {
  const locationTotals = useMemo(() => {
    if (!Object.keys(locationGroups).length) return {};

    const totals = {};
    Object.entries(locationGroups).forEach(([loc, ids]) => {
      const turbinesInLoc = turbines.filter((t) => ids.includes(Number(t.aggregateId)));
      const totalLive = turbinesInLoc.reduce((sum, t) => sum + (t.measurement || 0), 0);
      const totalForecast = turbinesInLoc.reduce((sum, t) => sum + (t.forecastNext10Min || 0), 0);
      totals[loc] = { totalLive, totalForecast };
    });

    return totals;
  }, [turbines, locationGroups]);

  if (loading || !Object.keys(locationGroups).length) {
    return (
      <div className="bg-white rounded p-4 min-h-[220px] flex flex-col items-center justify-center animate-pulse shadow-sm">
        <p className="text-gray-500 mb-2 text-sm">Forecast by Location</p>
        <div className="w-full h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  const labels = Object.keys(locationGroups);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Live Power (kW)",
        data: labels.map((l) => locationTotals[l]?.totalLive || 0),
        backgroundColor: [
          "rgba(99, 102, 241, 0.85)", // violet
          "rgba(139, 92, 246, 0.85)", // purple
          "rgba(59, 130, 246, 0.85)", // blue
          "rgba(129, 140, 248, 0.85)", // light violet
          "rgba(147, 197, 253, 0.85)", // sky blue
          "rgba(191, 132, 252, 0.85)", // soft purple
        ],
        borderRadius: 6,
      },
      {
        label: "Forecast (kW)",
        data: labels.map((l) => locationTotals[l]?.totalForecast || 0),
        backgroundColor: [
          "rgba(147, 197, 253, 0.6)", // lighter sky blue
          "rgba(196, 181, 253, 0.6)", // light purple
          "rgba(191, 219, 254, 0.6)", // soft blue
          "rgba(203, 213, 225, 0.6)", // grayish-blue
          "rgba(212, 180, 254, 0.6)", // pastel purple
          "rgba(167, 139, 250, 0.6)", // soft violet
        ],
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: { display: true, text: "Forecast vs Actual by Location", color: "#374151", font: { size: 16 } },
      legend: { position: "top", labels: { color: "#4B5563" } },
      tooltip: { mode: "nearest", intersect: true },
    },
    interaction: { mode: "nearest", intersect: true },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Power (kW)", color: "#374151" },
        ticks: { color: "#4B5563" },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      x: {
        ticks: { color: "#4B5563" },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
    },
  };

  return (
    <div className="relative bg-white p-4 min-h-[220px] transform transition-all duration-300 hover:scale-105 hover:shadow-lg rounded-md">
      <div className="absolute top-3 right-4">
        <InfoTooltip text="Forecast values represent the expected output for the next 10 minutes." />
      </div>

      <Bar data={chartData} options={options} />
    </div>
  );
}
