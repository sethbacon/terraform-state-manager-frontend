import { Alert } from '@mui/material'
import { useTranslation } from 'react-i18next'

/** Pre-write guidance for transfer targets whose backends have write
 *  semantics beyond a plain byte copy (workspace creation, git pushes). */
export default function TargetBackendHint({ type }: { type?: string }) {
  const { t } = useTranslation()
  if (type === 'hcp') return <Alert severity="info">{t('pages.transfer.hcpTargetHint')}</Alert>
  if (type === 'git') return <Alert severity="info">{t('pages.transfer.gitTargetHint')}</Alert>
  return null
}
