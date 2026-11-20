# Release Process & CHANGELOG Hygiene Guide

This guide details the release coordination cycle, Semantic Versioning policy, and CHANGELOG maintenance rules for the AudioBlocks Artist Dashboard.

---

## 1. Versioning Strategy

AudioBlocks follows [Semantic Versioning (SemVer 2.0.0)](https://semver.org/):
- **MAJOR (`X.0.0`)**: Incompatible API breaks, major protocol shifts, or breaking changes to on-chain Soroban contract integrations that require coordinated migration.
- **MINOR (`0.X.0`)**: Backwards-compatible new features, new dashboard sections, or added wallet/contract interaction capabilities.
- **PATCH (`0.0.X`)**: Backwards-compatible bug fixes, styling corrections, security patches, or documentation additions.

---

## 2. CHANGELOG.md Hygiene

The project maintains a root `CHANGELOG.md` adhering strictly to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

### 2.1. The Single Source of Truth
The `/dashboard/changelog` in-app page parses `CHANGELOG.md` at build time. Entries added here appear directly as user-facing release notes in the artist dashboard.

### 2.2. Standard Categories
Every entry in `## [Unreleased]` must fall under one of these standard sections:
- `### Added` for new user or developer capabilities.
- `### Changed` for modifications to existing behavior.
- `### Deprecated` for soon-to-be-removed features.
- `### Removed` for now-removed features.
- `### Fixed` for any bug fix.
- `### Security` in case of vulnerabilities or hardened safeguards.

### 2.3. Entry Syntax
Entries must follow this format:
```markdown
- **Short title** (#PR_NUMBER): Descriptive summary explaining what changed and why it matters to artists or developers.
```

---

## 3. Release Execution Protocol

When executing a new production release:

### Step 1: Promote the Unreleased Section
1. In `CHANGELOG.md`, rename `## [Unreleased]` to:
   ```markdown
   ## [Unreleased]

   ## [X.Y.Z] - YYYY-MM-DD
   ```
2. Move the staged changes into the new version section.

### Step 2: Version Bump in Application
Update the version string in `app/package.json` and sync the lockfile:
```bash
cd app
npm version X.Y.Z --no-git-tag-version
```

### Step 3: Open Release Pull Request
1. Branch from `main`: `git checkout -b chore/release-vX.Y.Z`.
2. Commit:
   ```bash
   git commit -am "chore(release): prepare vX.Y.Z release notes and version bump"
   ```
3. Open a PR with the title `chore(release): vX.Y.Z`.
4. Ensure all CI checks (lint, unit tests, Storybook build) pass.
5. Merge into `main` after review.

### Step 4: Tag and Release
Once merged to `main`:
```bash
git checkout main
git pull upstream main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push upstream vX.Y.Z
```
Create a GitHub Release referencing the tag and pasting the release notes section from `CHANGELOG.md`.
