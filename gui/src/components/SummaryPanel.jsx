import React, { useState, useEffect } from "react";
export default function SummaryPanel({ selectedDate }) {
    const [stats, setStats] = useState(null);
    useEffect(() => {
        if (!selectedDate) return;
        const cleanDate =
            selectedDate.replace(/-/g, "");
        fetch(
            `/api/flood-statistics?date=${cleanDate}`
        )
            .then((res) => {
                if (!res.ok) {
                    throw new Error(
                        "Failed to load statistics"
                    );
                }
                return res.json();
            })
            .then((data) => {
                setStats(data);
            })
            .catch((err) => {
                console.error(err);
            });
    }, [selectedDate]);
    if (!stats) {
        return (
            <div className="summary-panel p-4 bg-white shadow rounded">
                <h3>
                    Gobind Sugar Mill Flood Monitor
                </h3>
                <p className="text-gray-500">
                    Select a flood date...
                </p>
            </div>
        );
    }
    return (
        <div className="summary-panel p-4 bg-white shadow rounded">
            <h3 className="font-bold text-lg">
                Gobind Sugar Mill Flood Monitor
            </h3>
            <hr />
            <div className="space-y-2 text-sm">
                <p>
                    <strong>Date:</strong>{" "}
                    {stats.date}
                </p>
                <p>
                    <strong>Flooded Area:</strong>{" "}
                    {Number(
                        stats.flooded_area_ha
                    ).toLocaleString()}
                    {" "}ha
                </p>
                <p>
                    <strong>Affected Area:</strong>{" "}
                    {Number(
                        stats.affected_area_ha
                    ).toLocaleString()}
                    {" "}ha
                </p>
                <p>
                    <strong>Affected Parcels:</strong>{" "}
                    {Number(
                        stats.affected_parcels
                    ).toLocaleString()}
                    {" / "}
                    {Number(
                        stats.total_parcels
                    ).toLocaleString()}
                </p>
                <p>
                    <strong>Affected %:</strong>{" "}
                    {stats.affected_pct}%
                </p>
                <p>
                    <strong>Average Flooding:</strong>{" "}
                    {stats.average_pct_flooded}%
                </p>
                <p className="text-red-600 font-semibold">
                    <strong>Extreme Parcels:</strong>{" "}
                    {Number(
                        stats.extreme_parcels
                    ).toLocaleString()}
                </p>
            </div>
        </div>
    );
}