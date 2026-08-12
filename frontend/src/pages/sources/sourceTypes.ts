// The backend-connector field schema: for each state-source type, the config
// fields the operator fills in. It is data, not UI, and both the Add and the
// Edit dialog render from it — hence its own module rather than a copy in each.
//
// Field flags drive three separate behaviours, so they are not interchangeable:
//   secret     — render as a password input
//   optional   — may be left blank (label gets the "(optional)" suffix)
//   credential — never stored in `config`; sent under `credentials` and
//                encrypted at rest. Blank on edit means "keep the stored secret",
//                which is why EditSourceDialog treats credentials as optional
//                even when they are required on create.
export interface FieldDef {
  key: string
  label: string
  secret?: boolean
  optional?: boolean
  credential?: boolean
  placeholder?: string
  helper?: string
}

export const SOURCE_TYPES: { value: string; label: string; fields: FieldDef[] }[] = [
  {
    value: 'local',
    label: 'Local directory',
    fields: [
      { key: 'base_path', label: 'Base path', placeholder: '/path/to/tfstate', helper: 'Directory scanned for .tfstate files' },
    ],
  },
  {
    value: 'hcp',
    label: 'HCP Terraform / Terraform Enterprise',
    fields: [
      { key: 'organization', label: 'Organization' },
      { key: 'hostname', label: 'Hostname', optional: true, placeholder: 'app.terraform.io' },
      { key: 'token', label: 'API token', secret: true, credential: true, helper: 'Stored encrypted at rest' },
    ],
  },
  {
    value: 's3',
    label: 'AWS S3 (or S3-compatible)',
    fields: [
      { key: 'bucket', label: 'Bucket' },
      { key: 'region', label: 'Region', optional: true, placeholder: 'us-east-1' },
      { key: 'prefix', label: 'Key prefix', optional: true },
      { key: 'endpoint', label: 'Endpoint (S3-compatible)', optional: true, placeholder: 'https://…' },
      { key: 'access_key_id', label: 'Access key ID', optional: true, credential: true },
      { key: 'secret_access_key', label: 'Secret access key', secret: true, optional: true, credential: true },
    ],
  },
  {
    value: 'azureblob',
    label: 'Azure Blob Storage',
    fields: [
      { key: 'account', label: 'Storage account' },
      { key: 'container', label: 'Container' },
      { key: 'prefix', label: 'Blob prefix', optional: true },
      { key: 'account_key', label: 'Account key', secret: true, credential: true, helper: 'Stored encrypted at rest' },
    ],
  },
  {
    value: 'gcs',
    label: 'Google Cloud Storage',
    fields: [
      { key: 'bucket', label: 'Bucket' },
      { key: 'prefix', label: 'Object prefix', optional: true },
      {
        key: 'credentials_json',
        label: 'Service account JSON',
        secret: true,
        optional: true,
        credential: true,
        helper: 'Paste the key JSON, or leave blank to use Application Default Credentials',
      },
    ],
  },
  {
    value: 'git',
    label: 'Git repository',
    fields: [
      { key: 'repo_url', label: 'Repository URL', placeholder: 'https://github.com/org/repo.git' },
      { key: 'ref', label: 'Branch', optional: true, placeholder: 'main' },
      { key: 'prefix', label: 'Path prefix', optional: true },
      { key: 'username', label: 'Username', optional: true, placeholder: 'git' },
      { key: 'token', label: 'Token', secret: true, optional: true, credential: true, helper: 'For private repos; stored encrypted' },
    ],
  },
  {
    value: 'consul',
    label: 'Consul KV',
    fields: [
      { key: 'address', label: 'Address', placeholder: 'consul.example.com:8500' },
      { key: 'scheme', label: 'Scheme', optional: true, placeholder: 'http' },
      { key: 'path', label: 'KV path prefix', optional: true, placeholder: 'terraform' },
      { key: 'datacenter', label: 'Datacenter', optional: true },
      { key: 'token', label: 'ACL token', secret: true, optional: true, credential: true, helper: 'Stored encrypted at rest' },
    ],
  },
  {
    value: 'pg',
    label: 'PostgreSQL backend',
    fields: [
      {
        key: 'conn_str',
        label: 'Connection string',
        secret: true,
        credential: true,
        placeholder: 'postgres://user:pass@host:5432/db?sslmode=require',
        helper: 'Stored encrypted at rest',
      },
      { key: 'schema_name', label: 'Schema', optional: true, placeholder: 'terraform_remote_state' },
    ],
  },
  {
    value: 'kubernetes',
    label: 'Kubernetes secrets',
    fields: [
      { key: 'server', label: 'API server URL', placeholder: 'https://k8s.example.com:6443' },
      { key: 'namespace', label: 'Namespace', optional: true, placeholder: 'default' },
      { key: 'labels', label: 'Label selector', optional: true, placeholder: 'app.kubernetes.io/managed-by=terraform' },
      { key: 'ca_cert', label: 'Cluster CA (PEM)', optional: true },
      { key: 'token', label: 'Bearer token', secret: true, credential: true, helper: 'Stored encrypted at rest' },
    ],
  },
  {
    value: 'http',
    label: 'HTTP backend',
    fields: [
      { key: 'address', label: 'State URL', placeholder: 'https://state.example.com/tf/prod' },
      { key: 'lock_address', label: 'Lock URL', optional: true, helper: 'Enables native LOCK/UNLOCK locking' },
      { key: 'unlock_address', label: 'Unlock URL', optional: true },
      { key: 'update_method', label: 'Update method', optional: true, placeholder: 'POST' },
      { key: 'username', label: 'Username', optional: true, credential: true },
      { key: 'password', label: 'Password', secret: true, optional: true, credential: true, helper: 'Stored encrypted at rest' },
    ],
  },
]
