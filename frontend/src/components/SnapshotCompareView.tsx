import { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import api from '../services/api';

interface Props {
  workspaceName: string;
}

interface Snapshot {
  id: string;
  created_at: string;
  workspace_name: string;
}

interface CompareResult {
  added: Array<{ address: string; type: string; provider: string }>;
  removed: Array<{ address: string; type: string; provider: string }>;
  modified: Array<{ address: string; changes: string[] }>;
}

const SnapshotCompareView = ({ workspaceName }: Props) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [beforeId, setBeforeId] = useState('');
  const [afterId, setAfterId] = useState('');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listSnapshots({ workspace_name: workspaceName })
      .then((data: unknown) => {
        const d = data as { data?: Snapshot[] } | Snapshot[];
        const list = Array.isArray(d) ? d : ((d as { data?: Snapshot[] }).data ?? []);
        setSnapshots(list);
      })
      .catch(() => {});
  }, [workspaceName]);

  useEffect(() => {
    if (!beforeId || !afterId) return;
    setLoading(true);
    setError('');
    api
      .compareSnapshots({ before_id: beforeId, after_id: afterId })
      .then((data: unknown) => {
        const d = data as { data?: CompareResult } | CompareResult;
        const r = (d as { data?: CompareResult }).data ?? (d as CompareResult);
        setResult(r);
      })
      .catch(() => setError('Failed to compare snapshots'))
      .finally(() => setLoading(false));
  }, [beforeId, afterId]);

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Before</InputLabel>
          <Select value={beforeId} label="Before" onChange={(e) => setBeforeId(e.target.value)}>
            {snapshots.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {new Date(s.created_at).toLocaleString()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>After</InputLabel>
          <Select value={afterId} label="After" onChange={(e) => setAfterId(e.target.value)}>
            {snapshots.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {new Date(s.created_at).toLocaleString()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip label={`+${result.added.length} added`} color="success" size="small" />
            <Chip label={`-${result.removed.length} removed`} color="error" size="small" />
            <Chip label={`~${result.modified.length} modified`} color="warning" size="small" />
          </Stack>

          {result.added.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
                Added
              </Typography>
              {result.added.map((r) => (
                <Box
                  key={r.address}
                  sx={{
                    p: 1,
                    bgcolor: 'success.light',
                    opacity: 0.7,
                    borderRadius: 1,
                    mb: 0.5,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  }}
                >
                  {r.address}
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 1 }} />

          {result.removed.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="error.main" sx={{ mb: 1 }}>
                Removed
              </Typography>
              {result.removed.map((r) => (
                <Box
                  key={r.address}
                  sx={{
                    p: 1,
                    bgcolor: 'error.light',
                    opacity: 0.7,
                    borderRadius: 1,
                    mb: 0.5,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  }}
                >
                  {r.address}
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 1 }} />

          {result.modified.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1 }}>
                Modified
              </Typography>
              {result.modified.map((r) => (
                <Box
                  key={r.address}
                  sx={{
                    p: 1,
                    bgcolor: 'warning.light',
                    opacity: 0.7,
                    borderRadius: 1,
                    mb: 0.5,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  }}
                >
                  {r.address}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {!beforeId && !afterId && snapshots.length === 0 && (
        <Typography color="text.secondary">No snapshots available for this workspace.</Typography>
      )}
    </Box>
  );
};

export default SnapshotCompareView;
