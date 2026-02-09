import { useMemo } from "react";
import { findClosestIndex } from "../../../utils/turbineUtils";

export default function useChartData(details, selectedTimeIndex) {
  const lineChartData = useMemo(() => {
    if (!details) return { labels: [], datasets: [] };

    // Combine and sort timestamps from forecast + realtime
    const allTimestamps = Array.from(
      new Set([
        ...(details?.forecast?.map((f) => f.timestamp) || []),
        ...(details?.realtime?.map((r) => r.timestamp) || []),
      ])
    )
      .map((ts) => new Date(ts))
      .sort((a, b) => a - b);

    // --- FORECAST DATA ---
    let lastForecastValue = null;
    const forecastData = allTimestamps.map((ts) => {
      const f = details?.forecast?.find(
        (f) => new Date(f.timestamp).getTime() === ts.getTime()
      );
      if (f) lastForecastValue = f.measurement;
      return lastForecastValue;
    });

    // --- REALTIME DATA ---
    const realtimeData = allTimestamps.map((ts) => {
      const r = details?.realtime?.find(
        (r) => new Date(r.timestamp).getTime() === ts.getTime()
      );
      return r ? r.measurement : null;
    });

    return {
      labels: allTimestamps, 
      datasets: [
        {
          label: "Forecast",
          data: forecastData,
          borderColor: "orange",
          backgroundColor: "orange",
          tension: 0.3,
        },
        {
          label: "Real-time",
          data: realtimeData,
          borderColor: "blue",
          backgroundColor: "blue",
          borderDash: [5, 5],
          tension: 0.3,
          spanGaps: true,
        },
      ],
    };
  }, [details]);

  // --- CHART OPTIONS ---
  const chartOptions = useMemo(() => {
    const selectedTime = lineChartData.labels[selectedTimeIndex];
    return {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        tooltip: { enabled: true },
        annotation: {
          annotations: selectedTime
            ? {
                selectedLine: {
                  type: "line",
                  xMin: selectedTime,
                  xMax: selectedTime,
                  borderColor: "red",
                  borderWidth: 2,
                  label: {
                    content: selectedTime.toLocaleTimeString("en-GB", {
                      timeZone: "America/Curacao",
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    enabled: true,
                    position: "start",
                    backgroundColor: "rgba(255,0,0,0.6)",
                    color: "white",
                  },
                },
              }
            : {},
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "minute",
            tooltipFormat: "HH:mm",
            displayFormats: { minute: "HH:mm" },
          },
          ticks: {
            stepSize: 30, 
            source: "auto",
            autoSkip: true,
          },
          title: { display: true, text: "Time" },
        },
        y: { title: { display: true, text: "Power (kW)" } },
      },
    };
  }, [lineChartData.labels, selectedTimeIndex]);

  // --- NOW VALUES ---
  const nowValues = useMemo(() => {
    if (!lineChartData.labels.length || !details) return null;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const closestIndex = findClosestIndex(
      lineChartData.labels,
      nowMinutes,
      (d) => d.getHours() * 60 + d.getMinutes()
    );
    return {
      forecast: lineChartData.datasets?.[0]?.data?.[closestIndex] ?? "—",
      realtime:
        details.realtime?.[details.realtime.length - 1]?.measurement ?? "—",
    };
  }, [lineChartData, details]);

  return { lineChartData, chartOptions, nowValues };
}