import { useState, useCallback } from 'react';
import {
  Box, Typography, TextField, Stack, Chip, Alert,
} from '@mui/material';
import cronstrue from 'cronstrue';

interface ScheduleFormProps {
  value: string;
  onChange: (value: string) => void;
}

const PRESETS = [
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Daily at midnight', cron: '0 0 * * *' },
  { label: 'Weekly Monday', cron: '0 0 * * 1' },
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
];

const describeSchedule = (expr: string): string => {
  try {
    return cronstrue.toString(expr, { throwExceptionOnParseError: true });
  } catch {
    return '';
  }
};

const ScheduleForm = ({ value, onChange }: ScheduleFormProps) => {
  const [rawInput, setRawInput] = useState(value);

  const handleRawChange = useCallback((expr: string) => {
    setRawInput(expr);
    onChange(expr);
  }, [onChange]);

  const handlePreset = useCallback((cron: string) => {
    setRawInput(cron);
    onChange(cron);
  }, [onChange]);

  const description = describeSchedule(rawInput);
  const isValid = description !== '';

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Schedule Presets
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
        {PRESETS.map((p) => (
          <Chip
            key={p.cron}
            label={p.label}
            onClick={() => handlePreset(p.cron)}
            variant={rawInput === p.cron ? 'filled' : 'outlined'}
            color={rawInput === p.cron ? 'primary' : 'default'}
            size="small"
            clickable
          />
        ))}
      </Stack>

      <TextField
        fullWidth
        size="small"
        label="Cron Expression"
        value={rawInput}
        onChange={(e) => handleRawChange(e.target.value)}
        placeholder="0 * * * *"
        error={rawInput !== '' && !isValid}
        helperText={rawInput !== '' && !isValid ? 'Invalid cron expression' : undefined}
      />

      {isValid && rawInput !== '' && (
        <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
          {description}
        </Alert>
      )}
    </Box>
  );
};

export default ScheduleForm;
