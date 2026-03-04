import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  Link as MuiLink,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useHelp } from '../contexts/HelpContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const HELP_PANEL_WIDTH = 320;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HelpContent {
  title: string;
  overview: string;
  actions: { heading: string; text: string }[];
}

// ---------------------------------------------------------------------------
// Help content definitions – one per TSM route
// ---------------------------------------------------------------------------

const ANALYSIS_HELP: HelpContent = {
  title: 'Analysis Runs',
  overview:
    'Analysis runs inspect your Terraform state files for resource drift, unused resources, ' +
    'cost anomalies, and security misconfigurations. Each run produces a detailed report you ' +
    'can drill into.',
  actions: [
    {
      heading: 'Trigger a new analysis',
      text: 'Click "Run Analysis" to start a scan against one or more state sources. You can scope the run to specific workspaces.',
    },
    {
      heading: 'Filter and search',
      text: 'Use the status, date range, and source filters to narrow the list to the runs you care about.',
    },
    {
      heading: 'Compare runs',
      text: 'Select two completed runs to see a side-by-side diff of findings, making it easy to track remediation progress.',
    },
    {
      heading: 'Export results',
      text: 'Download analysis results as JSON or CSV for integration with external ticketing and reporting systems.',
    },
  ],
};

const ANALYSIS_DETAIL_HELP: HelpContent = {
  title: 'Analysis Detail',
  overview:
    'This page shows the full results of a single analysis run. Review every finding, see ' +
    'which resources drifted, and understand the recommended remediation steps.',
  actions: [
    {
      heading: 'Inspect findings',
      text: 'Expand each finding row to see the exact attribute changes detected between the state file and the live infrastructure.',
    },
    {
      heading: 'Acknowledge or dismiss',
      text: 'Mark findings as acknowledged to track your triage progress, or dismiss false positives so they no longer appear in future runs.',
    },
    {
      heading: 'View resource details',
      text: 'Click a resource address to see its full state attributes, provider metadata, and historical change timeline.',
    },
  ],
};

const WORKSPACES_HELP: HelpContent = {
  title: 'Workspaces',
  overview:
    'Browse all Terraform workspaces discovered from your connected state sources. Each ' +
    'workspace maps to a distinct state file and tracks its own resource inventory, drift ' +
    'status, and change history.',
  actions: [
    {
      heading: 'Search workspaces',
      text: 'Type in the search bar to filter workspaces by name, backend type, or organization. Use advanced filters for status and tags.',
    },
    {
      heading: 'View drift summary',
      text: 'The drift indicator on each workspace card shows whether the last analysis detected any out-of-band changes.',
    },
    {
      heading: 'Compare workspaces',
      text: 'Select multiple workspaces to compare their resource counts, provider distributions, and module usage side by side.',
    },
  ],
};

const WORKSPACE_DETAIL_HELP: HelpContent = {
  title: 'Workspace Detail',
  overview:
    'Dive into a single workspace to see its complete state history, resource inventory, ' +
    'and drift timeline. This is the starting point for understanding exactly what ' +
    'Terraform manages within this workspace.',
  actions: [
    {
      heading: 'Browse resources',
      text: 'The resource table lists every resource in the current state. Sort by type, module, or provider to find what you need.',
    },
    {
      heading: 'Review state history',
      text: 'The timeline shows every state version recorded. Click any version to see the diff against the previous version.',
    },
    {
      heading: 'Check drift events',
      text: 'The drift tab highlights resources whose real-world attributes no longer match the stored state, with before/after comparisons.',
    },
    {
      heading: 'Trigger a backup',
      text: 'Click "Backup Now" to capture a point-in-time snapshot of this workspace state, independent of the automated backup schedule.',
    },
  ],
};

const BACKUPS_HELP: HelpContent = {
  title: 'Backups',
  overview:
    'Manage point-in-time snapshots of your Terraform state files. Backups provide a safety ' +
    'net for accidental state corruption or destructive applies, and can be used to restore ' +
    'a workspace to a previous known-good state.',
  actions: [
    {
      heading: 'Browse backup inventory',
      text: 'View all stored backups sorted by date, workspace, or backend. The size and resource count help you verify completeness.',
    },
    {
      heading: 'Restore a backup',
      text: 'Select a backup and click "Restore" to replace the current workspace state with the backed-up version. A confirmation prompt prevents accidental restores.',
    },
    {
      heading: 'Configure retention',
      text: 'Set retention policies per workspace or globally to automatically prune old backups and manage storage consumption.',
    },
  ],
};

const MIGRATIONS_HELP: HelpContent = {
  title: 'Migrations',
  overview:
    'Plan and execute state migrations between Terraform backends. Whether you are moving ' +
    'from local to remote state, switching cloud providers, or consolidating workspaces, ' +
    'the migration wizard guides you through every step.',
  actions: [
    {
      heading: 'Create a migration plan',
      text: 'Select a source and destination backend, choose which workspaces to include, and preview the migration before committing.',
    },
    {
      heading: 'Monitor progress',
      text: 'Track each migration step in real time. The progress bar shows workspace-level status, and logs are streamed live.',
    },
    {
      heading: 'Roll back a migration',
      text: 'If something goes wrong, use the rollback action to revert all migrated workspaces to their pre-migration state from automatic backups.',
    },
  ],
};

const REPORTS_HELP: HelpContent = {
  title: 'Reports',
  overview:
    'Generate and download reports that summarize the health, compliance, and cost profile ' +
    'of your Terraform-managed infrastructure. Reports can be scheduled or created on demand.',
  actions: [
    {
      heading: 'Generate a report',
      text: 'Choose a report template, select the scope (all sources, specific workspaces, or a date range), and click "Generate."',
    },
    {
      heading: 'Download past reports',
      text: 'Previously generated reports are stored for quick access. Download them in PDF, CSV, or JSON format.',
    },
    {
      heading: 'Schedule recurring reports',
      text: 'Set up a weekly or monthly schedule so reports are automatically generated and delivered to your notification channels.',
    },
  ],
};

const DASHBOARDS_HELP: HelpContent = {
  title: 'Dashboards',
  overview:
    'Visualize key Terraform state metrics through interactive charts and widgets. ' +
    'Dashboards aggregate data across all connected sources so you can spot trends, ' +
    'track drift rates, and monitor resource growth over time.',
  actions: [
    {
      heading: 'Explore built-in dashboards',
      text: 'Switch between pre-built dashboards for drift trends, resource distribution, provider breakdown, and cost estimates.',
    },
    {
      heading: 'Adjust time range',
      text: 'Use the date picker to zoom in on a specific period or compare current metrics with historical baselines.',
    },
    {
      heading: 'Filter by source or workspace',
      text: 'Apply filters to scope dashboard data to a particular backend, organization, or set of workspaces.',
    },
  ],
};

const ALERTS_HELP: HelpContent = {
  title: 'Alerts',
  overview:
    'Define alert rules that fire when your Terraform state meets certain conditions, such ' +
    'as unexpected drift, backup failures, or resource count thresholds. Alerts are delivered ' +
    'through your configured notification channels.',
  actions: [
    {
      heading: 'Create an alert rule',
      text: 'Define a condition (e.g. "drift detected in production workspaces"), choose a severity, and assign a notification channel.',
    },
    {
      heading: 'Manage existing rules',
      text: 'Enable, disable, or edit alert rules from the list. Click a rule to see its firing history and recent notifications.',
    },
    {
      heading: 'Review alert history',
      text: 'The history tab shows every time an alert fired, including the triggering event details and which channels were notified.',
    },
  ],
};

const COMPLIANCE_HELP: HelpContent = {
  title: 'Compliance',
  overview:
    'Evaluate your Terraform state against organizational policies and industry standards. ' +
    'Compliance checks run automatically after each analysis and produce pass/fail results ' +
    'you can track over time.',
  actions: [
    {
      heading: 'View policy results',
      text: 'Each policy shows its latest evaluation status across all in-scope workspaces. Expand a row to see individual resource violations.',
    },
    {
      heading: 'Manage policies',
      text: 'Create custom policies using the built-in rule editor, or import policy packs aligned with CIS, SOC 2, or your own internal standards.',
    },
    {
      heading: 'Track compliance trends',
      text: 'The trend chart shows your overall compliance score over time, helping you measure the impact of remediation efforts.',
    },
    {
      heading: 'Export compliance evidence',
      text: 'Download a compliance report suitable for auditors, including policy definitions, evaluation timestamps, and resource-level details.',
    },
  ],
};

const API_DOCS_HELP: HelpContent = {
  title: 'API Documentation',
  overview:
    'Interactive reference for the Terraform State Manager REST API. Use this page to ' +
    'explore available endpoints, understand request and response schemas, and try out ' +
    'calls directly from the browser.',
  actions: [
    {
      heading: 'Browse endpoints',
      text: 'Endpoints are organized by resource type. Expand a section to see all available operations with their HTTP methods and paths.',
    },
    {
      heading: 'Try it out',
      text: 'Fill in the parameter fields and click "Execute" to make a live API call. The response is displayed inline with syntax highlighting.',
    },
    {
      heading: 'Copy code snippets',
      text: 'Each endpoint includes copy-ready curl, Python, and JavaScript examples pre-filled with your current authentication token.',
    },
  ],
};

const ADMIN_DASHBOARD_HELP: HelpContent = {
  title: 'Admin Dashboard',
  overview:
    'A birds-eye view of system-wide statistics for administrators. Monitor total users, ' +
    'organizations, API key usage, source health, and job queue depth from a single pane.',
  actions: [
    {
      heading: 'Monitor system health',
      text: 'The status indicators show whether background workers, state source connections, and notification channels are operating normally.',
    },
    {
      heading: 'Review usage metrics',
      text: 'Check how many API calls, analysis runs, and backup operations have been performed over the selected time window.',
    },
    {
      heading: 'Spot anomalies',
      text: 'Unusual spikes in error rates or job queue depth are highlighted automatically so you can investigate before users are impacted.',
    },
  ],
};

const USERS_HELP: HelpContent = {
  title: 'User Management',
  overview:
    'Administer user accounts across the Terraform State Manager. Invite new users, assign ' +
    'roles, manage organization memberships, and revoke access when needed.',
  actions: [
    {
      heading: 'Invite a user',
      text: 'Click "Invite" to send an email invitation. Choose the target organization and role to pre-assign permissions on acceptance.',
    },
    {
      heading: 'Edit user roles',
      text: 'Select a user and update their assigned roles. Changes take effect immediately on the next API request.',
    },
    {
      heading: 'Deactivate accounts',
      text: 'Deactivate a user to immediately revoke their access without deleting their audit trail or historical data.',
    },
  ],
};

const ORGANIZATIONS_HELP: HelpContent = {
  title: 'Organizations',
  overview:
    'Organizations are the top-level grouping for users, workspaces, and state sources. ' +
    'Each organization has its own set of permissions, policies, and resource boundaries.',
  actions: [
    {
      heading: 'Create an organization',
      text: 'Click "New Organization" to set up an isolated tenant with its own user roster, state sources, and compliance policies.',
    },
    {
      heading: 'Manage members',
      text: 'Add or remove users from an organization and control their role within that organizational scope.',
    },
    {
      heading: 'Configure settings',
      text: 'Update organization-level defaults such as backup retention, notification preferences, and analysis schedules.',
    },
  ],
};

const ROLES_HELP: HelpContent = {
  title: 'Role Templates',
  overview:
    'Roles define reusable permission sets that can be assigned to users. Each role specifies ' +
    'a list of scopes that control what actions a user can perform across the system.',
  actions: [
    {
      heading: 'Create a custom role',
      text: 'Define a new role by selecting the scopes it should grant. Use descriptive names like "Workspace Viewer" or "Compliance Auditor."',
    },
    {
      heading: 'Edit scope assignments',
      text: 'Modify which scopes a role includes. Adding or removing scopes immediately affects all users assigned to that role.',
    },
    {
      heading: 'Review role usage',
      text: 'See how many users are assigned to each role, helping you identify unused roles that can be cleaned up.',
    },
  ],
};

const APIKEYS_HELP: HelpContent = {
  title: 'API Keys',
  overview:
    'API keys provide programmatic access to the Terraform State Manager API. Use them in ' +
    'CI/CD pipelines, automation scripts, or third-party integrations that need to read or ' +
    'modify state data.',
  actions: [
    {
      heading: 'Generate a new key',
      text: 'Click "Create API Key," assign it a descriptive label and expiration date, and select the scopes it should carry.',
    },
    {
      heading: 'Rotate an existing key',
      text: 'Use the rotate action to generate a new secret for an existing key. The previous secret is revoked immediately.',
    },
    {
      heading: 'Revoke a key',
      text: 'Permanently disable an API key if it has been compromised or is no longer needed. Revocation is immediate and irreversible.',
    },
    {
      heading: 'Monitor key usage',
      text: 'The "Last Used" column shows when each key was last used, helping you identify stale keys that should be cleaned up.',
    },
  ],
};

const SOURCES_HELP: HelpContent = {
  title: 'State Sources',
  overview:
    'State sources represent the Terraform backends from which TSM reads state files. ' +
    'Configure connections to S3, GCS, Azure Blob, Terraform Cloud, Consul, or any ' +
    'supported backend type.',
  actions: [
    {
      heading: 'Add a new source',
      text: 'Click "Add Source" and fill in the backend type, credentials, and discovery settings. TSM will validate the connection before saving.',
    },
    {
      heading: 'Edit connection details',
      text: 'Update credentials, bucket paths, or workspace prefixes for an existing source. Changes trigger a re-discovery of workspaces.',
    },
    {
      heading: 'Test connectivity',
      text: 'Use the "Test" button to verify that TSM can reach the backend and list state files without committing any configuration changes.',
    },
  ],
};

const SCHEDULER_HELP: HelpContent = {
  title: 'Scheduler',
  overview:
    'Schedule recurring tasks such as analysis runs, backup snapshots, and compliance checks. ' +
    'The scheduler uses cron-style expressions and respects maintenance windows you define.',
  actions: [
    {
      heading: 'Create a scheduled task',
      text: 'Define the task type, target sources or workspaces, cron expression, and optional maintenance window constraints.',
    },
    {
      heading: 'View upcoming runs',
      text: 'The timeline shows the next scheduled execution for each task, so you can verify that nothing overlaps unexpectedly.',
    },
    {
      heading: 'Pause or resume tasks',
      text: 'Temporarily disable a scheduled task during change-freeze periods without losing its configuration.',
    },
    {
      heading: 'Review execution history',
      text: 'Each task tracks its past executions with status, duration, and links to the resulting analysis or backup records.',
    },
  ],
};

const DEFAULT_HELP: HelpContent = {
  title: 'Terraform State Manager',
  overview:
    'Welcome to the Terraform State Manager. Use the sidebar to navigate between sections. ' +
    'This help panel provides contextual guidance for whatever page you are viewing.',
  actions: [
    {
      heading: 'Navigate the sidebar',
      text: 'The left sidebar lists all available sections. Admin features appear under collapsible groups based on your permissions.',
    },
    {
      heading: 'Toggle dark mode',
      text: 'Click the sun/moon icon in the top bar to switch between light and dark themes.',
    },
    {
      heading: 'Open help anywhere',
      text: 'Click the help icon in the top bar to open this panel on any page. The content updates automatically as you navigate.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Route → HelpContent resolver
// ---------------------------------------------------------------------------

export const getHelpContent = (pathname: string): HelpContent => {
  // Parameterized routes (check first)
  if (/^\/analysis\/[^/]+$/.test(pathname)) return ANALYSIS_DETAIL_HELP;
  if (/^\/workspaces\/[^/]+$/.test(pathname)) return WORKSPACE_DETAIL_HELP;

  // Exact matches
  switch (pathname) {
    case '/':
      return DASHBOARDS_HELP;   // Dashboard is now the landing page
    case '/analysis':
      return ANALYSIS_HELP;
    case '/workspaces':
      return WORKSPACES_HELP;
    case '/backups':
      return BACKUPS_HELP;
    case '/migrations':
      return MIGRATIONS_HELP;
    case '/reports':
      return REPORTS_HELP;
    case '/alerts':
      return ALERTS_HELP;
    case '/compliance':
      return COMPLIANCE_HELP;
    case '/sources':              // Promoted from /admin/sources
      return SOURCES_HELP;
    case '/scheduler':            // Promoted from /admin/scheduler
      return SCHEDULER_HELP;
    case '/api-docs':
      return API_DOCS_HELP;

    // Admin routes
    case '/admin/dashboard':
      return ADMIN_DASHBOARD_HELP;
    case '/admin/users':
      return USERS_HELP;
    case '/admin/organizations':
      return ORGANIZATIONS_HELP;
    case '/admin/roles':
      return ROLES_HELP;
    case '/admin/api-keys':
      return APIKEYS_HELP;

    // Legacy redirects — keep for the instant before redirect fires
    case '/admin/sources':
      return SOURCES_HELP;
    case '/admin/scheduler':
      return SCHEDULER_HELP;
    case '/admin/notifications':
      return ALERTS_HELP;
    case '/dashboards':
      return DASHBOARDS_HELP;

    default:
      return DEFAULT_HELP;
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HelpPanel = () => {
  const { helpOpen, closeHelp } = useHelp();
  const { pathname } = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const content = getHelpContent(pathname);

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor="right"
      open={helpOpen}
      onClose={closeHelp}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: HELP_PANEL_WIDTH,
          boxSizing: 'border-box',
          top: { xs: 0, md: '64px' },
          height: { xs: '100%', md: 'calc(100% - 64px)' },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          {content.title}
        </Typography>
        <IconButton size="small" onClick={closeHelp} aria-label="Close help panel">
          <Close fontSize="small" />
        </IconButton>
      </Box>
      <Divider />

      {/* Body */}
      <Box sx={{ px: 2, py: 2, overflowY: 'auto', flexGrow: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {content.overview}
        </Typography>
        <Typography variant="overline" color="text.secondary">
          What you can do
        </Typography>
        <List disablePadding sx={{ mt: 0.5 }}>
          {content.actions.map((action) => (
            <ListItem
              key={action.heading}
              disablePadding
              sx={{ display: 'block', mb: 1.5 }}
            >
              <Typography variant="body2" fontWeight="bold">
                {action.heading}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {action.text}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Box>
      <Divider />

      {/* Footer */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Full API reference:{' '}
          <MuiLink
            component={RouterLink}
            to="/api-docs"
            onClick={isMobile ? closeHelp : undefined}
          >
            API Docs
          </MuiLink>
        </Typography>
      </Box>
    </Drawer>
  );
};

export default HelpPanel;
