import React, { useMemo } from "react";
import { Gauge } from "lucide-react";

export default function LowestPerformingTurbine({
  turbines = [],
  deviceMap = {},
  backendTurbine = null,
  loading = false,
}) {
  const lowest = useMemo(() => {
    if (backendTurbine) return backendTurbine;
    if (!turbines.length) return null;

    const valid = turbines
      .map((t) => {
        const real = Number(t.measurement ?? 0);
        const forecast = t.forecastNext10Min != null ? Number(t.forecastNext10Min) : null;
        const efficiency =
          forecast != null && forecast > 0
            ? (real / forecast) * 100
            : forecast === 0 && real === 0
            ? 100
            : 0;
        return { ...t, real, forecast, efficiency };
      })
      .filter((t) => t.real !== 0 || t.forecast !== 0);

    if (!valid.length) return null;
    return valid.reduce((min, t) => (t.efficiency < min.efficiency ? t : min), valid[0]);
  }, [turbines, backendTurbine]);

  if (loading || !lowest) {
    return (
      <div className="bg-white p-6 rounded-md shadow-sm flex flex-col items-center justify-center h-full animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        <div className="mt-3 w-12 h-1 rounded-full bg-gray-300" />
      </div>
    );
  }

  const turbineName = deviceMap[lowest.aggregateId] || `Turbine ${lowest.aggregateId}`;
  const startDate = lowest.start ? new Date(lowest.start).toLocaleDateString("en-CA") : null;
  const endDate = lowest.end ? new Date(lowest.end).toLocaleDateString("en-CA") : null;

  // Determine accent bar color based on efficiency
  const accentColor =
    lowest.efficiency != null
      ? lowest.efficiency < 60
        ? "bg-red-500"
        : lowest.efficiency < 80
        ? "bg-yellow-400"
        : "bg-green-500"
      : "bg-gray-300";

  return (
    <div className="bg-white p-6 rounded-md shadow-sm flex flex-col justify-between transform hover:scale-105 hover:shadow-md transition-transform duration-200 h-full">
      <div>
        {/* Header */}
        <div className="flex items-center mb-3">
          <Gauge className="text-red-500 mr-2" size={22} />
          <h2 className="text-lg font-semibold text-gray-800">Lowest Performing Turbine</h2>
        </div>

        {/* Turbine Name */}
        <p className="text-2xl font-bold text-gray-900 mb-2">{turbineName}</p>

        {/* Total Energy */}
        {lowest.totalMWh != null && startDate && endDate && (
          <p className="text-gray-600 text-sm mb-3">
            Total Energy: <span className="font-medium">{lowest.totalMWh.toFixed(1)} MWh</span> <br />
            ({startDate} → {endDate})
          </p>
        )}

        {/* Metrics */}
        <div className="text-gray-700 space-y-1 text-sm">
          {lowest.real != null && (
            <p>
              Real Power: <span className="font-medium">{lowest.real.toFixed(1)} kW</span>
            </p>
          )}
          {lowest.forecast != null && (
            <p>
              Forecast Power: <span className="font-medium">{lowest.forecast.toFixed(1)} kW</span>{" "}
              <span className="text-gray-400 italic">(Next 10 min forecast)</span>
            </p>
          )}
          {lowest.efficiency != null && (
            <p>
              Efficiency:{" "}
              <span
                className={`font-semibold ${
                  lowest.efficiency < 60 ? "text-red-500" : "text-green-600"
                }`}
              >
                {lowest.efficiency.toFixed(1)}%
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className={`mt-3 w-12 h-1 rounded-full ${accentColor}`} />
    </div>
  );
}
