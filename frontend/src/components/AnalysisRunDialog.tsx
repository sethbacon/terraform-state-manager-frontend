import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
} from '@mui/material';
import { StateSource } from '../types/analysis';

interface AnalysisRunDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (sourceId: string) => void;
  sources: StateSource[];
}

const AnalysisRunDialog: React.FC<AnalysisRunDialogProps> = ({
  open,
  onClose,
  onSubmit,
  sources,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');

  const handleSubmit = () => {
    if (!selectedSourceId) return;
    onSubmit(selectedSourceId);
    setSelectedSourceId('');
  };

  const handleClose = () => {
    setSelectedSourceId('');
    onClose();
  };

  const activeSources = sources.filter((s) => s.is_active);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Start New Analysis Run</DialogTitle>
      <DialogContent>
        {activeSources.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No active state sources available. Please add and activate a state source before running an analysis.
          </Typography>
        ) : (
          <TextField
            select
            label="Select State Source"
            value={selectedSourceId}
            onChange={(e) => setSelectedSourceId(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
            helperText="Choose the state source to analyze"
          >
            {activeSources.map((source) => (
              <MenuItem key={source.id} value={source.id}>
                {source.name} ({source.source_type.replace(/_/g, ' ')})
              </MenuItem>
            ))}
          </TextField>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!selectedSourceId || activeSources.length === 0}
        >
          Start Analysis
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnalysisRunDialog;
