import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import type { ResourceBreakdown } from '../../types/dashboard';

interface TopResourceTypesChartProps {
  data: ResourceBreakdown[];
}

const TopResourceTypesChart: React.FC<TopResourceTypesChartProps> = ({ data }) => {
  const theme = useMuiTheme();

  if (data.length === 0) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height={400}
      >
        <Typography color="text.secondary">
          Run an analysis to see resource type breakdown
        </Typography>
      </Box>
    );
  }

  const chartData = data
    .slice(0, 15)
    .map((item) => ({
      name: item.resource_type,
      count: item.count,
    }));

  const chartHeight = Math.max(300, chartData.length * 32);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme.palette.divider}
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={200}
          tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
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
        <Bar
          dataKey="count"
          name="Count"
          fill={theme.palette.primary.main}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopResourceTypesChart;
