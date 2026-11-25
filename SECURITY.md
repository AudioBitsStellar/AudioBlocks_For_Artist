# Security Policy

## Supported versions

We actively maintain the current release on the `main` branch.
Older branches or tags that have not received a commit in the last 90 days
are not guaranteed to receive security fixes.

| Branch / version | Security fixes |
| --- | --- |
| `main` (latest) | ✅ Yes |
| Other branches | ❌ No |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**
Disclosing a vulnerability publicly before a fix is available could put users
at risk.

Instead, report it privately via
[GitHub's private vulnerability reporting](https://github.com/AudioBitsStellar/AudioBlocks_For_Artist/security/advisories/new).
If you are unable to use that form, email the maintainers at the address
listed in the GitHub organisation profile.

Please include:

- A clear description of the vulnerability and its potential impact.
- The component, file, or endpoint affected.
- Reproduction steps or a minimal proof-of-concept (without exploiting live systems).
- Any suggested remediation, if you have one.

## Response timeline

| Milestone | Target |
| --- | --- |
| Initial acknowledgement | Within **2 business days** |
| Triage and severity assessment | Within **5 business days** |
| Fix or mitigation plan communicated | Within **14 days** for critical/high, **30 days** for medium/low |
| Public disclosure | Coordinated with the reporter after a fix is available |

We follow a **coordinated disclosure** model: we ask that reporters give us a
reasonable window to prepare a fix before publishing details. We aim to credit
reporters in release notes unless they prefer to remain anonymous.

## Scope

The following are **in scope** for this policy:

- The Next.js application in `app/` and its server-side API routes.
- Authentication and authorisation logic (Stellar wallet connection, role
  enforcement).
- Dependencies declared in `app/package.json` that introduce a known CVE
  rated **high** or **critical** by the npm advisory database.

The following are **out of scope**:

- Vulnerabilities in third-party services (Stellar network, Sentry, Vercel
  hosting, Cloudflare).
- Issues that require physical access to a device or social engineering of
  a maintainer.
- Denial-of-service attacks against publicly accessible endpoints that have
  no authentication bypass or data-exfiltration component.
- Reports generated purely by automated scanners with no manual verification.

## Preferred languages

We can review reports written in **English**.

## Acknowledgements

We thank all security researchers who responsibly disclose vulnerabilities
and help keep AudioBlocks safe for artists and fans.
