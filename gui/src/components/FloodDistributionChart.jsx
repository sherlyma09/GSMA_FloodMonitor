import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
export default function FloodDistributionChart({ summary }) {
    if (!summary) return null;
    const data = [
        {
            name: "Minor",
            value: summary.minor_area_pct || 0,
            color: "#ffd700"
        },
        {
            name: "Moderate",
            value: summary.moderate_area_pct || 0,
            color: "#ff8c00"
        },
        {
            name: "Severe",
            value: summary.severe_area_pct || 0,
            color: "#ff0000"
        },
        {
            name: "Extreme",
            value: summary.extreme_area_pct || 0,
            color: "#8b0000"
        }
    ];
    return (
        <div className="metric-card">
            <h3>Flood Severity Distribution</h3>
            <ResponsiveContainer
                width="100%"
                height={250}
            >
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        label={(entry) =>
                            `${entry.name} ${entry.value}%`
                        }
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={index}
                                fill={entry.color}
                            />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}