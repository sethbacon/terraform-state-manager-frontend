import React from 'react'
import { Avatar, Box } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAws, faMicrosoft } from '@fortawesome/free-brands-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  siHashicorp,
  siTerraform,
  siConsul,
  siKubernetes,
  siPostgresql,
  siGooglecloud,
} from 'simple-icons'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SimpleIconDef {
  path: string
  hex: string
  title: string
}

/** 'si'     → simple-icons SVG path
 *  'fa'     → Font Awesome brand icon (designed for small-size rendering)
 *  'avatar' → branded MUI Avatar with an abbreviation */
type IconStrategy =
  | { kind: 'si'; icon: SimpleIconDef }
  | { kind: 'fa'; icon: IconDefinition; color: string }
  | { kind: 'avatar'; abbrev: string; color: string }

interface ProviderConfig {
  displayName: string
  strategy: IconStrategy
}

// ---------------------------------------------------------------------------
// State-source registry
//
// Keyed on the State Manager `source_type` values (see CLAUDE.md → State
// Source Clients). Adapted from the registry frontend's ProviderIcon to the
// cloud/state backends TSM connects to.
// ---------------------------------------------------------------------------

const PROVIDERS: Record<string, ProviderConfig> = {
  // HCP Terraform Cloud
  hcp_terraform: {
    displayName: 'HCP Terraform',
    strategy: { kind: 'si', icon: siTerraform },
  },
  // AWS S3 / compatible
  s3: {
    displayName: 'AWS S3',
    strategy: { kind: 'fa', icon: faAws, color: '#FF9900' },
  },
  // Azure Blob Storage
  azure_blob: {
    displayName: 'Azure Blob',
    strategy: { kind: 'fa', icon: faMicrosoft, color: '#0089D6' },
  },
  // Google Cloud Storage
  gcs: {
    displayName: 'Google Cloud Storage',
    strategy: { kind: 'si', icon: siGooglecloud },
  },
  // HashiCorp Consul
  consul: {
    displayName: 'Consul',
    strategy: { kind: 'si', icon: siConsul },
  },
  // PostgreSQL
  pg: {
    displayName: 'PostgreSQL',
    strategy: { kind: 'si', icon: siPostgresql },
  },
  // Kubernetes (etcd)
  kubernetes: {
    displayName: 'Kubernetes',
    strategy: { kind: 'si', icon: siKubernetes },
  },
  // Generic HTTP/HTTPS backend
  http: {
    displayName: 'HTTP',
    strategy: { kind: 'avatar', abbrev: 'HTTP', color: '#546E7A' },
  },
  // Local filesystem
  local: {
    displayName: 'Local',
    strategy: { kind: 'avatar', abbrev: 'FS', color: '#5C6BC0' },
  },
  // Generic Terraform / HashiCorp fallbacks
  terraform: {
    displayName: 'Terraform',
    strategy: { kind: 'si', icon: siTerraform },
  },
  hashicorp: {
    displayName: 'HashiCorp',
    strategy: { kind: 'si', icon: siHashicorp },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the human-readable display name for a source-type slug. */
export function providerDisplayName(slug: string): string {
  return (
    PROVIDERS[slug.toLowerCase()]?.displayName ??
    // Fallback: title-case the raw slug for unknown source types
    slug.charAt(0).toUpperCase() + slug.slice(1)
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProviderIconProps {
  /** State Manager source_type slug (e.g. 's3', 'azure_blob', 'gcs'). */
  provider: string
  /** Icon size in px (default 28). */
  size?: number
}

/** Renders a recognisable icon for known State Manager source types.
 *  Returns null for unknown source types so the caller can decide whether to
 *  show a fallback itself. */
export const ProviderIcon: React.FC<ProviderIconProps> = ({ provider, size = 28 }) => {
  const config = PROVIDERS[provider.toLowerCase()]
  if (!config) return null

  const { strategy } = config

  if (strategy.kind === 'fa') {
    return (
      <Box
        component="span"
        aria-label={config.displayName}
        sx={{
          display: 'inline-flex',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: strategy.color,
        }}
      >
        <FontAwesomeIcon icon={strategy.icon} style={{ width: size, height: size }} />
      </Box>
    )
  }

  if (strategy.kind === 'si') {
    return (
      <Box
        component="svg"
        role="img"
        viewBox="0 0 24 24"
        aria-label={config.displayName}
        sx={{
          width: size,
          height: size,
          fill: `#${strategy.icon.hex}`,
          flexShrink: 0,
        }}
      >
        <path d={strategy.icon.path} />
      </Box>
    )
  }

  // avatar fallback
  const fontSize = strategy.abbrev.length >= 3 ? `${size * 0.28}px` : `${size * 0.34}px`

  return (
    <Avatar
      aria-label={config.displayName}
      sx={{
        bgcolor: strategy.color,
        width: size,
        height: size,
        fontSize,
        fontWeight: 700,
        letterSpacing: strategy.abbrev.length > 2 ? '-0.03em' : undefined,
        flexShrink: 0,
      }}
    >
      {strategy.abbrev}
    </Avatar>
  )
}
