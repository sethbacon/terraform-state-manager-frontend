import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

interface DashboardCardProps {
  title: string;
  value: number;
  subtitle?: string;
  accentColor?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  accentColor = '#7B61FF',
}) => {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 2.5,
        height: '100%',
        borderLeft: `4px solid ${accentColor}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        {(value ?? 0).toLocaleString()}
      </Typography>
      {subtitle && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default DashboardCard;
