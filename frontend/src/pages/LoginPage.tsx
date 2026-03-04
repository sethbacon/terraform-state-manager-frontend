import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Typography, Stack } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) return null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} alignItems="center">
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LockIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Typography variant="h5" fontWeight={600}>
              Terraform State Manager
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Sign in with your identity provider to manage Terraform state, analysis, backups, and more.
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={login}
              sx={{ mt: 2, py: 1.5 }}
            >
              Sign in with SSO
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
