import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { format } from 'date-fns';
import type { TrendDataPoint } from '../../types/dashboard';

interface ResourceOverviewChartProps {
  data: TrendDataPoint[];
}

const ResourceOverviewChart: React.FC<ResourceOverviewChartProps> = ({ data }) => {
  const theme = useMuiTheme();

  if (data.length === 0) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height={350}
      >
        <Typography color="text.secondary">
          Run an analysis to see resource overview trends
        </Typography>
      </Box>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    date: format(new Date(point.completed_at), 'MMM d, yyyy'),
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme.palette.divider}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 8,
            color: theme.palette.text.primary,
          }}
        />
        <Legend />
        <Bar
          dataKey="total_resources"
          name="Total Resources"
          fill={theme.palette.primary.main}
          opacity={0.3}
          barSize={40}
        />
        <Line
          type="monotone"
          dataKey="total_managed"
          name="Managed"
          stroke={theme.palette.success.main}
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="total_rum"
          name="RUM"
          stroke={theme.palette.warning.main}
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default ResourceOverviewChart;
