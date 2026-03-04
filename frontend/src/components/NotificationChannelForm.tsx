import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Stack,
  Typography,
  Alert as MuiAlert,
  CircularProgress,
} from '@mui/material';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationChannel {
  id: string;
  name: string;
  channel_type: string;
  config: Record<string, any>;
  is_active: boolean;
}

interface ChannelPayload {
  name: string;
  channel_type: string;
  config: Record<string, any>;
  is_active: boolean;
}

interface NotificationChannelFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (channel: ChannelPayload) => void;
  onTest?: (channelId: string) => void;
  editingChannel?: NotificationChannel | null;
  error: string;
}

// ---------------------------------------------------------------------------
// Channel-type field definitions
// ---------------------------------------------------------------------------

type ChannelType = 'webhook' | 'slack' | 'teams' | 'email';

interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'multiline';
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  defaultValue?: string;
}

const channelTypeOptions: { value: ChannelType; label: string }[] = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'slack', label: 'Slack' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'email', label: 'Email' },
];

const channelTypeFields: Record<ChannelType, FieldDef[]> = {
  webhook: [
    { key: 'url', label: 'URL', required: true, placeholder: 'https://example.com/webhook' },
    { key: 'secret', label: 'Secret', type: 'password', placeholder: 'Optional signing secret' },
    {
      key: 'custom_headers',
      label: 'Custom Headers',
      type: 'multiline',
      placeholder: 'Header-Name: value',
      helperText: 'One header per line in "Header-Name: value" format',
    },
  ],
  slack: [
    {
      key: 'webhook_url',
      label: 'Webhook URL',
      required: true,
      placeholder: 'https://hooks.slack.com/services/...',
    },
    {
      key: 'channel',
      label: 'Channel Name',
      placeholder: '#alerts',
      helperText: 'Optional override channel (e.g. #alerts)',
    },
    {
      key: 'username',
      label: 'Username',
      placeholder: 'TSM Bot',
      defaultValue: 'TSM Bot',
      helperText: 'Display name for messages',
    },
  ],
  teams: [
    {
      key: 'webhook_url',
      label: 'Webhook URL',
      required: true,
      placeholder: 'https://outlook.office.com/webhook/...',
    },
  ],
  email: [
    { key: 'smtp_host', label: 'SMTP Host', required: true, placeholder: 'smtp.example.com' },
    {
      key: 'smtp_port',
      label: 'SMTP Port',
      type: 'number',
      defaultValue: '587',
      helperText: 'Common ports: 25, 465, 587',
    },
    {
      key: 'from_address',
      label: 'From Address',
      required: true,
      placeholder: 'alerts@example.com',
    },
    {
      key: 'to_addresses',
      label: 'To Addresses',
      type: 'multiline',
      helperText: 'Comma-separated list of recipient email addresses',
      placeholder: 'admin@example.com, ops@example.com',
    },
    { key: 'tls', label: 'TLS', defaultValue: 'true' }, // handled specially as a Switch
    { key: 'username', label: 'Username', placeholder: 'SMTP username' },
    { key: 'password', label: 'Password', type: 'password', placeholder: 'SMTP password' },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build default config values for a given channel type. */
function buildDefaults(channelType: ChannelType): Record<string, string> {
  const defaults: Record<string, string> = {};
  const fields = channelTypeFields[channelType] || [];
  for (const field of fields) {
    if (field.defaultValue !== undefined) {
      defaults[field.key] = field.defaultValue;
    }
  }
  return defaults;
}

/** Determine whether all required fields are filled. */
function isFormValid(
  name: string,
  channelType: ChannelType,
  configValues: Record<string, string>,
): boolean {
  if (!name.trim()) return false;
  const fields = channelTypeFields[channelType] || [];
  for (const field of fields) {
    if (field.required && !configValues[field.key]?.trim()) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NotificationChannelForm: React.FC<NotificationChannelFormProps> = ({
  open,
  onClose,
  onSubmit,
  onTest,
  editingChannel,
  error,
}) => {
  const [name, setName] = useState('');
  const [channelType, setChannelType] = useState<ChannelType>('webhook');
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [testing, setTesting] = useState(false);

  // Reset / pre-populate whenever the dialog opens or the editing channel changes.
  useEffect(() => {
    if (!open) return;

    if (editingChannel) {
      setName(editingChannel.name);
      setChannelType(editingChannel.channel_type as ChannelType);
      setIsActive(editingChannel.is_active);

      const existing: Record<string, string> = {};
      for (const [key, value] of Object.entries(editingChannel.config)) {
        existing[key] = typeof value === 'string' ? value : String(value);
      }
      setConfigValues(existing);
    } else {
      setName('');
      setChannelType('webhook');
      setConfigValues(buildDefaults('webhook'));
      setIsActive(true);
    }
    setTesting(false);
  }, [open, editingChannel]);

  // ------ handlers ------

  const handleChannelTypeChange = useCallback((newType: ChannelType) => {
    setChannelType(newType);
    setConfigValues(buildDefaults(newType));
  }, []);

  const handleConfigChange = useCallback((key: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const config: Record<string, any> = {};
    for (const [key, value] of Object.entries(configValues)) {
      const trimmed = typeof value === 'string' ? value.trim() : String(value);
      if (trimmed !== '') {
        config[key] = trimmed;
      }
    }

    onSubmit({
      name: name.trim(),
      channel_type: channelType,
      config,
      is_active: isActive,
    });
  }, [name, channelType, configValues, isActive, onSubmit]);

  const handleTest = useCallback(() => {
    if (!editingChannel || !onTest) return;
    setTesting(true);
    onTest(editingChannel.id);
    // The parent is responsible for resetting any "testing" indicator via
    // closing/reopening the dialog or updating the error prop.
    setTimeout(() => setTesting(false), 3000);
  }, [editingChannel, onTest]);

  // ------ derived values ------

  const fields = useMemo(
    () => channelTypeFields[channelType] || [],
    [channelType],
  );

  const saveEnabled = useMemo(
    () => isFormValid(name, channelType, configValues),
    [name, channelType, configValues],
  );

  const isEditing = Boolean(editingChannel);

  // ------ render helpers ------

  const renderConfigField = (field: FieldDef) => {
    // Special case: the "tls" field for email is rendered as a Switch.
    if (field.key === 'tls' && channelType === 'email') {
      const checked = configValues['tls'] !== 'false';
      return (
        <FormControlLabel
          key={field.key}
          control={
            <Switch
              checked={checked}
              onChange={(e) =>
                handleConfigChange('tls', e.target.checked ? 'true' : 'false')
              }
            />
          }
          label="Enable TLS"
        />
      );
    }

    return (
      <TextField
        key={field.key}
        label={field.label}
        value={configValues[field.key] ?? ''}
        onChange={(e) => handleConfigChange(field.key, e.target.value)}
        required={field.required}
        fullWidth
        type={
          field.type === 'password'
            ? 'password'
            : field.type === 'number'
              ? 'number'
              : 'text'
        }
        multiline={field.type === 'multiline'}
        minRows={field.type === 'multiline' ? 3 : undefined}
        maxRows={field.type === 'multiline' ? 6 : undefined}
        placeholder={field.placeholder}
        helperText={field.helperText}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? 'Edit Notification Channel' : 'Create Notification Channel'}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && (
            <MuiAlert severity="error" variant="outlined">
              {error}
            </MuiAlert>
          )}

          {/* Channel name */}
          <TextField
            label="Channel Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            placeholder="Production Alerts"
          />

          {/* Channel type selector */}
          <FormControl fullWidth>
            <InputLabel id="channel-type-label">Channel Type</InputLabel>
            <Select
              labelId="channel-type-label"
              value={channelType}
              label="Channel Type"
              onChange={(e) => handleChannelTypeChange(e.target.value as ChannelType)}
              disabled={isEditing}
            >
              {channelTypeOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Dynamic config fields */}
          {fields.length > 0 && (
            <Typography variant="subtitle2" color="text.secondary">
              Configuration
            </Typography>
          )}

          {fields.map(renderConfigField)}

          {/* Active toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            }
            label="Active"
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        {isEditing && onTest && (
          <Button
            onClick={handleTest}
            disabled={testing}
            startIcon={testing ? <CircularProgress size={16} /> : undefined}
            sx={{ mr: 'auto' }}
          >
            {testing ? 'Testing...' : 'Test Channel'}
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!saveEnabled}
        >
          {isEditing ? 'Save Changes' : 'Create Channel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationChannelForm;
