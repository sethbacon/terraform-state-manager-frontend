import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { setupApi, type SetupStatus, type OIDCForm, type SourceForm } from '../services/setupApi'

// Step indices. In coupled mode (identity_owned_externally) the Owner and OIDC
// steps are hidden by the shell and pre-marked saved here.
export const STEP_AUTH = 0
export const STEP_OWNER = 1
export const STEP_OIDC = 2
export const STEP_SOURCES = 3
export const STEP_REVIEW = 4

function errMsg(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
  )
}

export interface SetupWizardContextValue {
  loading: boolean
  status: SetupStatus | null
  coupled: boolean
  activeStep: number
  goToStep: (n: number) => void
  error: string | null
  setError: (v: string | null) => void
  success: string | null

  setupToken: string
  setSetupToken: (v: string) => void
  tokenValid: boolean
  validating: boolean
  validateToken: () => Promise<void>

  ownerEmail: string
  setOwnerEmail: (v: string) => void
  ownerSaved: boolean
  ownerSaving: boolean
  saveOwner: () => Promise<void>

  oidcForm: OIDCForm
  setOidcForm: (f: OIDCForm) => void
  oidcSaved: boolean
  oidcTesting: boolean
  oidcSaving: boolean
  testOIDC: () => Promise<void>
  saveOIDC: () => Promise<void>

  sourceForm: SourceForm
  setSourceForm: (f: SourceForm) => void
  sourceConfigText: string
  setSourceConfigText: (v: string) => void
  sourcesSaved: boolean
  sourceTesting: boolean
  sourceSaving: boolean
  testSource: () => Promise<void>
  saveSource: () => Promise<void>

  completing: boolean
  completeSetup: () => Promise<void>
}

const Ctx = createContext<SetupWizardContextValue | undefined>(undefined)

export const useSetupWizard = (): SetupWizardContextValue => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSetupWizard must be used within a SetupWizardProvider')
  return c
}

interface ProviderProps {
  children: ReactNode
  onCompleted: () => void // setup already done → leave the wizard
  onFinalized: () => void // setup just finished → go to login
}

export const SetupWizardProvider: React.FC<ProviderProps> = ({ children, onCompleted, onFinalized }) => {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [activeStep, setActiveStep] = useState(STEP_AUTH)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [setupToken, setSetupToken] = useState('')
  const [tokenValid, setTokenValid] = useState(false)
  const [validating, setValidating] = useState(false)

  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerSaved, setOwnerSaved] = useState(false)
  const [ownerSaving, setOwnerSaving] = useState(false)

  const [oidcForm, setOidcForm] = useState<OIDCForm>({ issuer_url: '', client_id: '', client_secret: '' })
  const [oidcSaved, setOidcSaved] = useState(false)
  const [oidcTesting, setOidcTesting] = useState(false)
  const [oidcSaving, setOidcSaving] = useState(false)

  const [sourceForm, setSourceForm] = useState<SourceForm>({ name: '', type: 'local' })
  const [sourceConfigText, setSourceConfigText] = useState('')
  const [sourcesSaved, setSourcesSaved] = useState(false)
  const [sourceTesting, setSourceTesting] = useState(false)
  const [sourceSaving, setSourceSaving] = useState(false)

  const [completing, setCompleting] = useState(false)

  const coupled = status?.identity_owned_externally ?? false

  const reloadStatus = useCallback(async () => {
    try {
      setLoading(true)
      const s = await setupApi.getStatus()
      setStatus(s)
      if (s.setup_completed && !s.pending_feature_setup) {
        onCompleted()
        return
      }
      // Seed saved flags from the backend so a resumed setup reflects prior steps.
      if (s.admin_configured) setOwnerSaved(true)
      if (s.oidc_configured) setOidcSaved(true)
      if (s.sources_configured) setSourcesSaved(true)
      // Coupled: the sibling owns identity, so Owner/OIDC are not this wizard's job.
      if (s.identity_owned_externally) {
        setOwnerSaved(true)
        setOidcSaved(true)
      }
      // Default the OIDC redirect to this origin's callback if not yet set.
      setOidcForm((prev) =>
        prev.redirect_url ? prev : { ...prev, redirect_url: `${window.location.origin}/api/v1/auth/callback` },
      )
    } catch {
      setError('Failed to check setup status')
    } finally {
      setLoading(false)
    }
  }, [onCompleted])

  useEffect(() => {
    void reloadStatus()
  }, [reloadStatus])

  const goToStep = useCallback((n: number) => {
    setActiveStep(n)
    setError(null)
    setSuccess(null)
  }, [])

  const validateToken = async () => {
    try {
      setValidating(true)
      setError(null)
      const { valid } = await setupApi.validateToken(setupToken.trim())
      if (valid) {
        setTokenValid(true)
        setSuccess('Setup token verified.')
        // Skip the identity steps when the sibling owns identity.
        setActiveStep(coupled ? STEP_SOURCES : STEP_OWNER)
      }
    } catch (e) {
      setError(errMsg(e, 'Invalid setup token'))
      setTokenValid(false)
    } finally {
      setValidating(false)
    }
  }

  const saveOwner = async () => {
    try {
      setOwnerSaving(true)
      setError(null)
      await setupApi.configureOwner(setupToken, ownerEmail.trim().toLowerCase())
      setOwnerSaved(true)
      setSuccess('Owner configured.')
    } catch (e) {
      setError(errMsg(e, 'Failed to configure the owner'))
    } finally {
      setOwnerSaving(false)
    }
  }

  const testOIDC = async () => {
    try {
      setOidcTesting(true)
      setError(null)
      await setupApi.testOIDC(setupToken, oidcForm)
      setSuccess('OIDC issuer reachable.')
    } catch (e) {
      setError(errMsg(e, 'OIDC test failed'))
    } finally {
      setOidcTesting(false)
    }
  }

  const saveOIDC = async () => {
    try {
      setOidcSaving(true)
      setError(null)
      await setupApi.saveOIDC(setupToken, oidcForm)
      setOidcSaved(true)
      setSuccess('OIDC provider configured.')
    } catch (e) {
      setError(errMsg(e, 'Failed to save OIDC configuration'))
    } finally {
      setOidcSaving(false)
    }
  }

  // parseSourceConfig converts the optional JSON config textarea into an object,
  // returning an error string on malformed JSON.
  const parseSourceConfig = (): { config?: Record<string, unknown>; err?: string } => {
    const text = sourceConfigText.trim()
    if (!text) return {}
    try {
      return { config: JSON.parse(text) as Record<string, unknown> }
    } catch {
      return { err: 'Source config must be valid JSON' }
    }
  }

  const testSource = async () => {
    const { config, err } = parseSourceConfig()
    if (err) {
      setError(err)
      return
    }
    try {
      setSourceTesting(true)
      setError(null)
      const r = await setupApi.testSource(setupToken, { ...sourceForm, config })
      setSuccess(`Connection ok — ${r.states} state(s) found.`)
    } catch (e) {
      setError(errMsg(e, 'Source connection test failed'))
    } finally {
      setSourceTesting(false)
    }
  }

  const saveSource = async () => {
    const { config, err } = parseSourceConfig()
    if (err) {
      setError(err)
      return
    }
    try {
      setSourceSaving(true)
      setError(null)
      await setupApi.saveSource(setupToken, { ...sourceForm, config })
      setSourcesSaved(true)
      setSuccess('State source added.')
    } catch (e) {
      setError(errMsg(e, 'Failed to add the state source'))
    } finally {
      setSourceSaving(false)
    }
  }

  const completeSetup = async () => {
    try {
      setCompleting(true)
      setError(null)
      await setupApi.complete(setupToken)
      setSuccess('Setup complete. Redirecting to sign in…')
      setTimeout(onFinalized, 2000)
    } catch (e) {
      setError(errMsg(e, 'Failed to complete setup'))
    } finally {
      setCompleting(false)
    }
  }

  const value: SetupWizardContextValue = {
    loading,
    status,
    coupled,
    activeStep,
    goToStep,
    error,
    setError,
    success,
    setupToken,
    setSetupToken,
    tokenValid,
    validating,
    validateToken,
    ownerEmail,
    setOwnerEmail,
    ownerSaved,
    ownerSaving,
    saveOwner,
    oidcForm,
    setOidcForm,
    oidcSaved,
    oidcTesting,
    oidcSaving,
    testOIDC,
    saveOIDC,
    sourceForm,
    setSourceForm,
    sourceConfigText,
    setSourceConfigText,
    sourcesSaved,
    sourceTesting,
    sourceSaving,
    testSource,
    saveSource,
    completing,
    completeSetup,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
