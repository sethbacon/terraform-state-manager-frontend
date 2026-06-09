import { useTranslation } from 'react-i18next'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { Box, Link, Typography } from '@mui/material'

/**
 * ApiDocumentation renders the backend's OpenAPI spec (served at /swagger.json,
 * generated from handler swag annotations) with swagger-ui-react. The spec is
 * same-origin via the nginx/vite proxy.
 */
export default function ApiDocumentation() {
  const { t } = useTranslation()
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('nav.apiDocs')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 760 }}>
        {t('help.pages.apiDocs.body')}{' '}
        <Link href="/swagger.json" target="_blank" rel="noopener noreferrer">
          /swagger.json
        </Link>
        {' · '}
        <Link href="/swagger.yaml" target="_blank" rel="noopener noreferrer">
          /swagger.yaml
        </Link>
      </Typography>
      {/* swagger-ui injects its own styling; scope it so MUI theme spacing is preserved. */}
      <Box sx={{ '& .swagger-ui': { fontFamily: 'inherit' } }}>
        <SwaggerUI url="/swagger.json" docExpansion="list" defaultModelsExpandDepth={0} />
      </Box>
    </Box>
  )
}
