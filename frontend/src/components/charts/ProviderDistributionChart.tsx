import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import type { ProviderDistribution } from '../../types/dashboard';

const COLORS = [
  '#7B61FF',
  '#00BFA5',
  '#FF6B35',
  '#2196F3',
  '#E91E63',
  '#9C27B0',
  '#FF9800',
  '#4CAF50',
  '#00BCD4',
  '#795548',
];

interface ProviderDistributionChartProps {
  data: ProviderDistribution[];
}

const ProviderDistributionChart: React.FC<ProviderDistributionChartProps> = ({ data }) => {
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
          Run an analysis to see provider distribution
        </Typography>
      </Box>
    );
  }

  const chartData = data.map((item) => ({
    name: item.provider,
    value: item.resource_count,
    workspaces: item.workspace_count,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) =>
            `${name} (${(percent * 100).toFixed(0)}%)`
          }
        >
          {chartData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 8,
            color: theme.palette.text.primary,
          }}
          formatter={(value: number) => [`${value} resources`, 'Count']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ProviderDistributionChart;
