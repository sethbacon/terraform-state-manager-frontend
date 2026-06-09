import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { api, type SSOConfig } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import PageHeader from '../../components/PageHeader'
import TableSkeleton from '../../components/skeletons/TableSkeleton'

function StatusChip({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation()
  return (
    <Chip
      size="small"
      color={enabled ? 'success' : 'default'}
      label={enabled ? t('pages.sso.enabled') : t('pages.sso.disabled')}
    />
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <Typography variant="body2" color="text.secondary">
      {label}: <Box component="code" sx={{ fontFamily: 'monospace' }}>{value}</Box>
    </Typography>
  )
}

function Section({ title, enabled, children }: { title: string; enabled: boolean; children?: ReactNode }) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h6">{title}</Typography>
          <StatusChip enabled={enabled} />
        </Stack>
        <Stack spacing={1}>{children}</Stack>
      </CardContent>
    </Card>
  )
}

// Group→role mapping table for OIDC/SAML (keyed by group) and LDAP (keyed by DN).
function GroupMappingTable({ rows, keyLabel }: { rows: { key: string; organization: string; role: string }[]; keyLabel: string }) {
  const { t } = useTranslation()
  if (rows.length === 0) return <Typography variant="body2" color="text.secondary">{t('pages.sso.noMappings')}</Typography>
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{keyLabel}</TableCell>
          <TableCell>{t('pages.sso.organization')}</TableCell>
          <TableCell>{t('pages.sso.role')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            <TableCell sx={{ fontFamily: 'monospace' }}>{r.key}</TableCell>
            <TableCell>{r.organization}</TableCell>
            <TableCell>{r.role}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function SSOPage() {
  const { t } = useTranslation()
  const q = useQuery<SSOConfig>({ queryKey: queryKeys.admin.sso(), queryFn: api.getSSOConfig })

  return (
    <Box>
      <PageHeader title={t('pages.sso.title')} description={t('pages.sso.description')} />
      {q.isLoading && <TableSkeleton rows={4} columns={3} />}
      {q.isError && <Alert severity="error">{t('common.error')}</Alert>}
      {q.data && (
        <Stack spacing={2}>
          <Section title={t('pages.sso.oidc')} enabled={q.data.oidc.enabled}>
            <Field label={t('pages.sso.issuer')} value={q.data.oidc.issuer_url} />
            <Field label={t('pages.sso.groupClaim')} value={q.data.oidc.group_claim_name} />
            <Field label={t('pages.sso.defaultRole')} value={q.data.oidc.default_role} />
            <GroupMappingTable
              keyLabel={t('pages.sso.group')}
              rows={q.data.oidc.group_mappings.map((m) => ({ key: m.group, organization: m.organization, role: m.role }))}
            />
          </Section>

          <Section title={t('pages.sso.saml')} enabled={q.data.saml.enabled}>
            <Field label={t('pages.sso.entityId')} value={q.data.saml.entity_id} />
            <Field label={t('pages.sso.acsUrl')} value={q.data.saml.acs_url} />
            <Field label={t('pages.sso.groupAttribute')} value={q.data.saml.group_attribute_name} />
            <Field label={t('pages.sso.defaultRole')} value={q.data.saml.default_role} />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">{t('pages.sso.idpInitiated')}:</Typography>
              <Chip size="small" variant="outlined" label={q.data.saml.allow_idp_initiated ? t('common.yes') : t('common.no')} />
            </Stack>
            {q.data.saml.idps.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
                <Typography variant="body2" color="text.secondary">{t('pages.sso.idps')}:</Typography>
                {q.data.saml.idps.map((name) => (
                  <Chip key={name} size="small" variant="outlined" label={name} />
                ))}
              </Stack>
            )}
            <GroupMappingTable
              keyLabel={t('pages.sso.group')}
              rows={q.data.saml.group_mappings.map((m) => ({ key: m.group, organization: m.organization, role: m.role }))}
            />
          </Section>

          <Section title={t('pages.sso.ldap')} enabled={q.data.ldap.enabled}>
            <Field label={t('pages.sso.host')} value={q.data.ldap.host} />
            <Field label={t('pages.sso.baseDn')} value={q.data.ldap.base_dn} />
            <Field label={t('pages.sso.defaultRole')} value={q.data.ldap.default_role} />
            <GroupMappingTable
              keyLabel={t('pages.sso.groupDn')}
              rows={q.data.ldap.group_mappings.map((m) => ({ key: m.group_dn, organization: m.organization, role: m.role }))}
            />
          </Section>

          <Section title={t('pages.sso.mtls')} enabled={q.data.mtls.enabled}>
            <Field label={t('pages.sso.caFile')} value={q.data.mtls.client_ca_file} />
            {q.data.mtls.mappings.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t('pages.sso.noMappings')}</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('pages.sso.subject')}</TableCell>
                    <TableCell>{t('pages.sso.scopes')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {q.data.mtls.mappings.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{m.subject}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {m.scopes.map((s) => (
                            <Chip key={s} size="small" variant="outlined" label={s} />
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>

          <Section title={t('pages.sso.scim')} enabled={q.data.scim.enabled}>
            <Typography variant="body2" color="text.secondary">{t('pages.sso.scimNote')}</Typography>
          </Section>
        </Stack>
      )}
    </Box>
  )
}
