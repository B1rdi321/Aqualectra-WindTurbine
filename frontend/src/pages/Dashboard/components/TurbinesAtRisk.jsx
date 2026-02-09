import React, { useEffect, useState } from "react"; 
import { Line } from "react-chartjs-2";
import { Filler } from "chart.js";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  CategoryScale,
} from "chart.js";

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, Filler);

export default function TurbinesAtRiskCard() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const [turbines, setTurbines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openTurbine, setOpenTurbine] = useState(null);
  const [collapsed, setCollapsed] = useState(true); 

  useEffect(() => {
    const fetchTurbines = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/turbines-risk`);
        const data = await res.json();
        setTurbines(data.turbinesAtRisk || []);
      } catch (err) {
        console.error("Error fetching turbines at risk:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTurbines();
    const interval = setInterval(fetchTurbines, 60000);
    return () => clearInterval(interval);
  }, []);

  const severityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "high": return "#f56565";
      case "medium": return "#ed8936";
      case "low": return "#ecc94b";
      case "stopped": return "#9b2c2c";
      default: return "#a0aec0";
    }
  };

  const buildTrendChart = (deviationTrend = [], forecastTrend = [], severity) => {
    const color = severityColor(severity);
    const forecastStart = deviationTrend.length;

    return {
      labels: [...deviationTrend, ...forecastTrend].map((_, i) => i),
      datasets: [
        {
          label: "Actual",
          data: deviationTrend,
          borderColor: color,
          backgroundColor: `${color}33`,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
        },
        {
          label: "Forecast",
          data: Array(forecastStart).fill(null).concat(forecastTrend),
          borderColor: color,
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: { target: "origin", above: `${color}22` },
        },
      ],
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      {/* Header with collapse/expand */}
      <div
        className="flex justify-between items-center cursor-pointer mb-3 select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3 className="text-red-600 font-bold text-lg tracking-wide flex items-center">
          Turbines at Risk
          <span
            className={`ml-2 transition-transform duration-300 ${
              collapsed ? "-rotate-90" : "rotate-0"
            }`}
          >
            ▶
          </span>
        </h3>
        {collapsed && (
          <span className="text-gray-700 font-semibold text-sm">
            {turbines.length} turbines
          </span>
        )}
      </div>

      {/* Severity Legend */}
      {!collapsed && (
        <div className="flex flex-wrap gap-3 mb-4">
          {["high", "medium", "low", "stopped"].map((state) => (
            <div key={state} className="flex items-center space-x-1">
              <span
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: severityColor(state) }}
              ></span>
              <span className="text-xs font-semibold text-gray-700">{state.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-center py-6">Loading turbines...</p>
      ) : turbines.length === 0 ? (
        <p className="text-gray-500 text-center py-6">No turbines at risk</p>
      ) : (
        <ul
          className={`space-y-3 transition-all duration-500 ${
            collapsed ? "max-h-0 overflow-hidden" : "max-h-[2000px]"
          }`}
        >
          {turbines.map((t) => {
            const isOpen = openTurbine === t.turbineId;
            const lineColor = severityColor(t.severity);
            const forecastSlope = t.forecastTrend
              ? (t.forecastTrend[t.forecastTrend.length - 1] - t.forecastTrend[0]) /
                t.forecastTrend.length
              : 0;

            const trendArrow =
              forecastSlope < 0 ? (
                <span className="text-red-600 font-bold ml-1">▼</span>
              ) : forecastSlope > 0 ? (
                <span className="text-green-600 font-bold ml-1">▲</span>
              ) : (
                <span className="text-gray-400 font-bold ml-1">→</span>
              );

            return (
              <li
                key={t.turbineId}
                className="p-3 rounded-2xl bg-gray-50 border border-gray-200 transition-all duration-300"
              >
                <div
                  onClick={() => setOpenTurbine(isOpen ? null : t.turbineId)}
                  className="flex justify-between items-center cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <p className="font-semibold text-gray-800 text-sm md:text-base flex items-center">
                      {t.name} {trendArrow}
                    </p>
                    <div className="w-28 h-7 md:h-8">
                      {t.deviationTrend && (
                        <Line
                          data={buildTrendChart(
                            t.deviationTrend,
                            t.forecastTrend,
                            t.severity
                          )}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { x: { display: false }, y: { display: false } },
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-sm font-semibold rounded-full text-white`}
                    style={{ backgroundColor: lineColor }}
                  >
                    {t.severity?.toUpperCase() || "UNKNOWN"}
                  </span>
                </div>

                {/* Individual turbine expand */}
                <div
                  className={`overflow-hidden transition-all duration-500 ${
                    isOpen ? "max-h-80 mt-2" : "max-h-0"
                  }`}
                >
                  {isOpen && (
                    <div className="space-y-2 mt-2">
                      <p className="text-gray-600 text-sm italic">{t.reasoning}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <p>Last Deviation: {t.lastDeviation.toFixed(2)}</p>
                        <p>Slope: {t.slope.toFixed(2)}</p>
                        <p>Volatility: {t.volatility.toFixed(2)}</p>
                        {t.stopped && <p className="font-semibold text-red-700">STOPPED</p>}
                      </div>
                      <div className="h-24 md:h-28">
                        <Line
                          data={buildTrendChart(
                            t.deviationTrend,
                            t.forecastTrend,
                            t.severity
                          )}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { x: { display: true }, y: { display: true } },
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
