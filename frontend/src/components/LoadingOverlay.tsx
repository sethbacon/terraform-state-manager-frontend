import React from 'react';
import { Backdrop, Box, CircularProgress, Typography } from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ open, message }) => {
  return (
    <Backdrop
      open={open}
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={2}
      >
        <CircularProgress color="inherit" />
        {message && (
          <Typography variant="body1" color="inherit">
            {message}
          </Typography>
        )}
      </Box>
    </Backdrop>
  );
};

export default LoadingOverlay;
