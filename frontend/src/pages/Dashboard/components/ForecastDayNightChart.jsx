import React, { useRef, useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ForecastDayNightChart({
  forecastDayMWh,
  forecastNightMWh,
  filters,
  loading,
  error,
}) {
  const lastForecastDayRef = useRef(forecastDayMWh);
  const lastForecastNightRef = useRef(forecastNightMWh);

  const [animatedDay, setAnimatedDay] = useState(forecastDayMWh || 0);
  const [animatedNight, setAnimatedNight] = useState(forecastNightMWh || 0);

  useEffect(() => {
    if (!loading && !error && forecastDayMWh != null && forecastNightMWh != null) {
      const duration = 500;
      const frameRate = 30;
      const totalFrames = Math.round((duration / 1000) * frameRate);
      let frame = 0;

      const startDay = animatedDay;
      const startNight = animatedNight;

      const animate = () => {
        frame++;
        const progress = frame / totalFrames;

        setAnimatedDay(startDay + (forecastDayMWh - startDay) * progress);
        setAnimatedNight(startNight + (forecastNightMWh - startNight) * progress);

        if (frame < totalFrames) requestAnimationFrame(animate);
      };

      animate();
    }
  }, [forecastDayMWh, forecastNightMWh, loading, error]);

  const displayDay = loading ? 0 : animatedDay;
  const displayNight = loading ? 0 : animatedNight;
  const total = displayDay + displayNight;

  const pieData = {
    labels: ["Day", "Night"],
    datasets: [
      {
        data: total > 0 ? [displayDay, displayNight] : [1, 1],
        backgroundColor: ["#1D4ED8", "#F97316"], // modern softer palette
        hoverOffset: 6,
      },
    ],
  };

  const startDate = filters.startDate ? new Date(filters.startDate) : new Date();
  const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
  const displayStartDate = startDate.toLocaleDateString("en-CA");
  const displayEndDate = endDate.toLocaleDateString("en-CA");

  const today = new Date();
  const isToday =
    startDate.toDateString() === today.toDateString() &&
    endDate.toDateString() === today.toDateString();

  return (
    <div className="bg-white p-4 shadow-sm flex flex-col items-center gap-3 transition-transform hover:scale-105 duration-200">

      {/* Top labels */}
      <div className="flex w-full justify-around">
        <div className="flex flex-col items-center">
          <p className="text-gray-600 text-xs uppercase tracking-wide">Forecast Day</p>
          {loading ? (
            <div className="h-5 w-14 bg-gray-300 rounded animate-pulse"></div>
          ) : (
            <p className="text-xl font-semibold text-blue-500">{displayDay.toFixed(1)} MWh</p>
          )}
        </div>

        <div className="flex flex-col items-center">
          <p className="text-gray-600 text-xs uppercase tracking-wide">Forecast Night</p>
          {loading ? (
            <div className="h-5 w-14 bg-gray-300 rounded animate-pulse"></div>
          ) : (
            <p className="text-xl font-semibold text-orange-500">{displayNight.toFixed(1)} MWh</p>
          )}
        </div>
      </div>

      {/* Pie Chart */}
      <div className="w-28 h-28 mt-2 flex items-center justify-center">
        {loading ? (
          <div className="w-16 h-16 bg-gray-300 rounded-full animate-pulse"></div>
        ) : (
          <Pie data={pieData} />
        )}
      </div>

      {/* Footer period text */}
      <p className="text-gray-500 text-xs mt-1 text-center">
        {loading
          ? <span className="h-3 w-28 bg-gray-300 rounded inline-block animate-pulse"></span>
          : isToday
            ? "Forecast for today"
            : `Forecast for ${displayStartDate} – ${displayEndDate}`}
      </p>

      {/* Bottom accent bar */}
      <div className="mt-2 w-10 h-1 bg-gradient-to-r from-blue-400 to-orange-400" />
    </div>
  );
}
