import React, { useMemo } from "react";
import { FiZap } from "react-icons/fi";

export default function RealtimeTotalMW({ turbines = [], loading }) {
  const totalMW = useMemo(() => {
    const totalKW = turbines.reduce(
      (sum, t) => sum + (t.measurement || 0),
      0
    );
    return totalKW / 1000; // kW → MW
  }, [turbines]);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <FiZap className="text-slate-400 text-2xl" />

        <div>
          <p className="text-sm text-slate-500">
            Realtime total power
          </p>

          {loading ? (
            <div className="h-6 w-28 bg-slate-200 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-2xl font-semibold text-slate-800">
              {totalMW.toFixed(2)} MW
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-right">
        Based on current filters
      </p>
    </div>
  );
}
