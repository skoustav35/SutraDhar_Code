# Computer-use runtime

Computer and browser control is provided by the packaged desktop runtime. The Sutradhar tools in
`.sutradhar/plugins/computer-use-operator.ts` communicate with an authenticated loopback service created by the
Electron main process at startup.

The runtime owns:

- managed, isolated browser windows backed by Electron Chromium and the Chrome DevTools Protocol;
- semantic browser accessibility snapshots and stable observation-bound target references;
- Windows UI Automation discovery and control through the packaged PowerShell STA helper;
- screenshots, focus, window identity, target freshness, cancellation, and post-action observations;
- user handoff and fail-closed behavior for sensitive or ambiguous flows.

## Runtime configuration

The desktop process creates a random loopback endpoint and bearer token for every launch. It injects these into the
Sutradhar sidecar environment:

```text
SUTRADHAR_COMPUTER_USE_URL=http://127.0.0.1:<random-port>
SUTRADHAR_COMPUTER_USE_TOKEN=<random-per-launch-token>
```

The older `SUTRADHAR_COMPUTER_USE_URL` and `SUTRADHAR_COMPUTER_USE_TOKEN` aliases remain supported for development and
external integrations, but production desktop builds do not require manual configuration.

The service rejects non-loopback requests, missing or incorrect bearer tokens, non-POST requests, oversized payloads,
unknown endpoints, unsafe browser URLs, stale observations, and actions outside the authorized session target.

## HTTP contract

All requests are JSON `POST` requests under `/v1/` and include:

```text
x-sutradhar-computer-use-version: 1
Authorization: Bearer <per-launch-token>
```

Every response is JSON:

```json
{
  "ok": true,
  "observationId": "obs_123",
  "data": {
    "surface": "browser",
    "sessionID": "session_123",
    "title": "Example",
    "url": "https://example.com",
    "text": "Visible text",
    "controls": []
  }
}
```

Failures return:

```json
{
  "ok": false,
  "error": "The target observation is stale",
  "code": "request_failed",
  "retryable": false
}
```

### `POST /v1/capabilities`

Returns the available surfaces, backends, actions, and runtime features.

### `POST /v1/observe`

Input contains:

```json
{
  "surface": "browser" | "desktop",
  "sessionID": "...",
  "includeScreenshot": true,
  "includeAccessibility": true,
  "window": "optional native window identifier"
}
```

Every observation returns a fresh `observationId`. Browser controls contain semantic roles, accessible names,
backend-node identity, and bounds. Desktop controls contain UI Automation paths, roles, names, values, actions, and
bounds.

### `POST /v1/action`

Input contains:

```json
{
  "surface": "browser" | "desktop",
  "action": "click" | "fill" | "select" | "key" | "scroll" | "drag" | "navigate" | "wait" | "focus" | "windows",
  "sessionID": "...",
  "observationId": "obs_123"
}
```

Mutating browser and desktop actions must use the latest observation. Successful mutations return a fresh observation
whenever the backend can observe the result.

### `POST /v1/handoff`

Pauses automation and keeps the user in control for authentication, CAPTCHA, payment, consent, secrets, destructive
confirmation, or ambiguity.

### `POST /v1/verify`

Verifies assertions against a fresh browser or desktop state. Tool success is never inferred solely from an input event
being dispatched.

## Native Windows backend

The packaged `packages/desktop/resources/computer-use/windows-helper.ps1` runs in a dedicated STA PowerShell process.
It uses Windows UI Automation for semantic discovery and control patterns and uses bounded `SendInput`/mouse fallback
only when a target does not expose an appropriate UI Automation pattern. The helper communicates over newline-delimited
JSON and is restarted when it exits.

The application packages the helper under `computer-use/windows-helper.ps1`. It is not exposed as a shell tool and is
never launched with user-provided command-line arguments.

## Safety model

- Every computer-use tool requests an explicit permission.
- Browser and desktop mutations require a fresh observation ID.
- Browser navigation only accepts `http` and `https` URLs.
- Passwords, tokens, OTPs, payment data, and secrets are blocked at the tool layer.
- Native desktop coordinates are bounded and must belong to the current observation.
- Semantic target identity includes session, window, observation, and backend identity.
- The helper and browser runtime reject stale, missing, ambiguous, or out-of-scope targets.
- Bridge output is marked as untrusted UI data before it reaches the model.
- Sign-in, CAPTCHA, payment, consent, destructive actions, and ambiguity use handoff.
- The desktop Settings → Computer Use page exposes runtime readiness and an emergency stop.
