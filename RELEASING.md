<!-- markdownlint-disable MD013 -->
# Releasing

Releases are automated by [release-please](https://github.com/googleapis/release-please).

## How it works

Every commit that lands on `main` with a Conventional Commit type runs
`release-please.yml`. release-please reads the commit history since the last tag, determines
the semver bump (`feat` → minor, `fix`/`perf`/`security` → patch, `feat!` /
`BREAKING CHANGE:` footer → major), updates `CHANGELOG.md` and the `version` field in
`frontend/package.json`, and keeps an open PR titled `chore(main): release X.Y.Z`. The PR
stays open and accumulates entries as more commits land. Merging it is the release action.

The release-please configuration lives in `.release-please-config.json` (release-type
`simple`, with `frontend/package.json` `$.version` declared as an extra-file) and
`.release-please-manifest.json` (the current released version).

## Cutting a release

1. Review the open release-please PR (titled `chore(main): release X.Y.Z`). Verify the
   CHANGELOG entries and version bump look correct.
2. **Merge the PR** (squash merge). release-please uses a GitHub App token
   (`RELEASE_DISPATCH_APP_ID` / `RELEASE_DISPATCH_APP_KEY`) to push the tag, which bypasses
   the `GITHUB_TOKEN` downstream-trigger restriction so the tagged release pipeline can run.
3. `release.yml` fires automatically from the tag push (`v[0-9]+.[0-9]+.[0-9]+*`):
   - A **guard** job verifies the tagged commit is reachable from `origin/main` (GitHub
     cannot filter tag events by branch, so releases must originate from `main`).
   - Builds and pushes the frontend Docker image (nginx + built SPA) to
     `ghcr.io/<owner>/terraform-state-manager-frontend`, tagged `vX.Y.Z`, `X.Y`, `X`, and
     `latest`.
   - Attests SLSA build provenance (`actions/attest-build-provenance`).
   - Signs the image with cosign (keyless, Sigstore).

   The GitHub Release itself is created by release-please when the release PR merges, so
   `release.yml` only builds and publishes the image.

## Verifying supply-chain attestations

```bash
# Verify container provenance
gh attestation verify oci://ghcr.io/sethbacon/terraform-state-manager-frontend:vX.Y.Z \
  --repo sethbacon/terraform-state-manager-frontend

# Verify cosign signature
cosign verify \
  --certificate-identity-regexp 'https://github\.com/sethbacon/terraform-state-manager-frontend/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/sethbacon/terraform-state-manager-frontend:vX.Y.Z
```

## Hotfix flow

1. Create a `fix/` branch from `main`.
2. Merge the PR (Conventional Commit title: `fix: <description>`).
3. release-please will bump the patch version in the open release PR.
4. If the fix is urgent, merge the release PR immediately; otherwise let it accumulate with
   other pending changes.

## Manual fallback (if release-please fails)

1. Check the `Release Please` workflow run logs in the Actions tab.
2. If the manifest is stale, update `.release-please-manifest.json` to the current released
   version and re-run the `Release Please` workflow via `workflow_dispatch`.
3. To tag and release manually (the tag must point at a commit on `main`, or the
   `release.yml` guard job will fail):

   ```bash
   git tag -a vX.Y.Z origin/main -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   # release.yml fires from the tag push
   ```

4. If `release.yml` did not fire (e.g., the tag was pushed by `GITHUB_TOKEN`), dispatch it
   explicitly:

   ```bash
   gh workflow run release.yml -f tag=vX.Y.Z
   ```

## GitHub App key rotation

The release App's private key is stored as `RELEASE_DISPATCH_APP_KEY` (repository secret),
with its App ID in `RELEASE_DISPATCH_APP_ID` (repository variable). To rotate:

1. In the GitHub App settings, generate a new private key and download it.
2. Update `RELEASE_DISPATCH_APP_KEY` in the repository's Actions secrets.
3. Delete the old private key from the GitHub App settings.
4. Verify by dispatching `release-please.yml` manually.

## Rollback

release-please does not support automated rollback. To undo a release:

1. Revert the offending commit(s) on `main` with a `revert:` commit.
2. release-please will propose a new patch release that includes the revert.
3. For Docker image rollback, re-tag the previous good image as `latest` in the GitHub
   Container Registry, and point any deployment configs at the previous image tag.
