import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Box,
} from '@mui/material';
import type { AnalysisRun } from '../types/analysis';
import type { GenerateReportRequest } from '../types/dashboard';

interface ReportGenerateDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (request: GenerateReportRequest) => Promise<void>;
  analysisRuns: AnalysisRun[];
  loading?: boolean;
}

const ReportGenerateDialog: React.FC<ReportGenerateDialogProps> = ({
  open,
  onClose,
  onGenerate,
  analysisRuns,
  loading = false,
}) => {
  const [format, setFormat] = useState<'markdown' | 'json' | 'csv'>('markdown');
  const [name, setName] = useState('');
  const [runId, setRunId] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!runId) {
      setError('Please select an analysis run');
      return;
    }
    setError('');
    try {
      const request: GenerateReportRequest = {
        run_id: runId,
        format,
      };
      if (name.trim()) {
        request.name = name.trim();
      }
      await onGenerate(request);
      handleClose();
    } catch {
      setError('Failed to generate report. Please try again.');
    }
  };

  const handleClose = () => {
    setFormat('markdown');
    setName('');
    setRunId('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Report</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <FormControl fullWidth>
            <InputLabel id="run-select-label">Analysis Run</InputLabel>
            <Select
              labelId="run-select-label"
              value={runId}
              label="Analysis Run"
              onChange={(e) => setRunId(e.target.value)}
            >
              {analysisRuns.map((run) => (
                <MenuItem key={run.id} value={run.id}>
                  {run.id.slice(0, 8)}... - {run.status} ({run.total_workspaces} workspaces)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl component="fieldset">
            <FormLabel component="legend">Report Format</FormLabel>
            <RadioGroup
              row
              value={format}
              onChange={(e) => setFormat(e.target.value as 'markdown' | 'json' | 'csv')}
            >
              <FormControlLabel value="markdown" control={<Radio />} label="Markdown" />
              <FormControlLabel value="json" control={<Radio />} label="JSON" />
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
            </RadioGroup>
          </FormControl>

          <TextField
            label="Report Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Monthly RUM Report"
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={loading || !runId}
        >
          {loading ? 'Generating...' : 'Generate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportGenerateDialog;
