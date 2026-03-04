import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const CallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login', { replace: true });
      return;
    }

    if (token) {
      setToken(token);
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, setToken, navigate]);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress />
      <Typography sx={{ mt: 2 }}>Completing sign in...</Typography>
    </Box>
  );
};

export default CallbackPage;
