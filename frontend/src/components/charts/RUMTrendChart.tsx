import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { format } from 'date-fns';
import type { TrendDataPoint } from '../../types/dashboard';

interface RUMTrendChartProps {
  data: TrendDataPoint[];
}

const RUMTrendChart: React.FC<RUMTrendChartProps> = ({ data }) => {
  const theme = useMuiTheme();

  if (data.length === 0) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height={300}
      >
        <Typography color="text.secondary">
          Run an analysis to see RUM trends
        </Typography>
      </Box>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    date: format(new Date(point.completed_at), 'MMM d, yyyy'),
  }));

  const gradientId = 'rumGradient';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={theme.palette.warning.main}
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor={theme.palette.warning.main}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey="total_rum"
          name="RUM Count"
          stroke={theme.palette.warning.main}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={{ r: 4, fill: theme.palette.warning.main }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default RUMTrendChart;
