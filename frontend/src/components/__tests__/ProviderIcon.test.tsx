import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProviderIcon, providerDisplayName } from '../ProviderIcon';

describe('providerDisplayName', () => {
  it('returns the configured display name for a known source type', () => {
    expect(providerDisplayName('s3')).toBe('AWS S3');
    expect(providerDisplayName('azure_blob')).toBe('Azure Blob');
    expect(providerDisplayName('gcs')).toBe('Google Cloud Storage');
  });

  it('is case-insensitive on the slug', () => {
    expect(providerDisplayName('S3')).toBe('AWS S3');
  });

  it('title-cases unknown source types as a fallback', () => {
    expect(providerDisplayName('mystery')).toBe('Mystery');
  });
});

describe('ProviderIcon', () => {
  it('renders a labelled icon for a simple-icons source type', () => {
    render(<ProviderIcon provider="gcs" />);
    expect(screen.getByLabelText('Google Cloud Storage')).toBeInTheDocument();
  });

  it('renders a labelled icon for a FontAwesome source type', () => {
    render(<ProviderIcon provider="s3" />);
    expect(screen.getByLabelText('AWS S3')).toBeInTheDocument();
  });

  it('renders an avatar fallback for the local source type', () => {
    render(<ProviderIcon provider="local" />);
    expect(screen.getByLabelText('Local')).toHaveTextContent('FS');
  });

  it('renders nothing for an unknown source type', () => {
    const { container } = render(<ProviderIcon provider="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });
});
