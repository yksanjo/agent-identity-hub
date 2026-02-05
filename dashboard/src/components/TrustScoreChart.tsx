import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrustScoreData } from '../types';

interface TrustScoreChartProps {
  data: TrustScoreData[];
  height?: number;
}

export const TrustScoreChart: React.FC<TrustScoreChartProps> = ({ data, height = 200 }) => {
  const formattedData = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString(),
    score: Math.round(d.score * 100)
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
          <XAxis
            dataKey="date"
            stroke="#666"
            tick={{ fill: '#888', fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#666"
            tick={{ fill: '#888', fontSize: 10 }}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              background: '#1a1a2e',
              border: '1px solid #4a4a6a',
              borderRadius: 4,
              color: '#e0e0e0'
            }}
            formatter={(value: number) => [`${value}%`, 'Trust Score']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#4ecdc4"
            strokeWidth={2}
            dot={{ fill: '#4ecdc4', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: '#4ecdc4' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrustScoreChart;
