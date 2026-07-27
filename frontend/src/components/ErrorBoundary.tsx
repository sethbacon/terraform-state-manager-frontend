import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Alert, AlertTitle, Button, Container, Stack, Typography } from '@mui/material'
import i18n from '../i18n'
import { captureError } from '../services/errorReporting'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  errorId: string | null
}

// Short, non-sensitive correlation id shown to the user and attached to the
// captured error, so a report can be matched to the logged details without
// disclosing the raw Error.message in the UI (#234, CWE-209).
function makeErrorId(): string {
  try {
    return crypto.randomUUID().slice(0, 8)
  } catch {
    return Math.random().toString(36).slice(2, 10)
  }
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, errorId: null }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true, errorId: makeErrorId() }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // The raw error goes to the developer sink only, never the UI (#234).
    captureError(error, {
      errorId: this.state.errorId ?? undefined,
      componentStack: errorInfo?.componentStack ?? undefined,
    })
  }

  handleReset = (): void => {
    this.setState({ hasError: false, errorId: null })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Container maxWidth="sm" sx={{ py: 8 }} role="alert" aria-live="assertive">
          <Alert severity="error">
            <AlertTitle component="h2">{i18n.t('errorBoundary.title')}</AlertTitle>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {i18n.t('errorBoundary.description')}
            </Typography>
            {this.state.errorId && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                {i18n.t('errorBoundary.reference', { id: this.state.errorId })}
              </Typography>
            )}
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={this.handleReset}>
                {i18n.t('errorBoundary.tryAgain')}
              </Button>
              <Button size="small" variant="contained" onClick={this.handleReload}>
                {i18n.t('errorBoundary.reloadPage')}
              </Button>
            </Stack>
          </Alert>
        </Container>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
