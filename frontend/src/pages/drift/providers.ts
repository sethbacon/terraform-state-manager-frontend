// The CI-provider field schema: for each provider TSM can dispatch a drift run
// to, the coordinates an operator supplies when entering a connection by hand.
// Shared by the add and edit pipeline dialogs (which render the field set) and
// by the workflow-template dialog (which only needs the value/label pairs).
export const PROVIDERS: { value: string; label: string; fields: { key: string; label: string; optional?: boolean; placeholder?: string }[] }[] = [
  {
    value: 'github_actions',
    label: 'GitHub Actions',
    fields: [
      { key: 'owner', label: 'Owner' },
      { key: 'repo', label: 'Repository' },
      { key: 'workflow_id', label: 'Workflow file or id', placeholder: 'tsm-drift.yml' },
      { key: 'ref', label: 'Default ref', optional: true, placeholder: 'main' },
    ],
  },
  {
    value: 'azure_devops',
    label: 'Azure DevOps',
    fields: [
      { key: 'organization', label: 'Organization' },
      { key: 'project', label: 'Project' },
      { key: 'pipeline_id', label: 'Pipeline id' },
      { key: 'ref', label: 'Default ref', optional: true, placeholder: 'refs/heads/main' },
    ],
  },
]
