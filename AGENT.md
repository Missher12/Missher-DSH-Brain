# Install Brain 0.1.2

Install only `dsh-missher-brain` into the user's selected official Harness `web` profile. The supported Host is Harness `0.1.5-rc.2` with Cordis `4.0.2` and Node `^22.19.0 || >=24.0.0`. Keep existing profiles, provider data and session history. Do not install Memory, MSE or another plugin unless the user requests it.

```sh
dsh plugin --profile web add https://github.com/Missher12/dsh-missher-brain/releases/download/v0.1.2/dsh-missher-brain-0.1.2.tgz
```

The asset must exist at this exact versioned URL and match the release checksum. If it is unpublished or unavailable, report that fact; do not substitute a floating version or another repository. DSH Market availability separately requires catalog approval.

Reload/restart the selected Host and verify **Settings → Memory & Learning** (`brain`). Check provider states through the ordinary UI or `missherBrain/snapshot` where exposed; do not claim UI success from package installation alone. With no provider, unavailable rows and no automatic recall are expected. A duplicate `missherBrain` service requires resolving the existing installation rather than loading both.

```sh
dsh plugin --profile web remove dsh-missher-brain
```

Removal preserves Memory/MSE stores and existing session data. Recalled content remains untrusted background information and cannot authorize actions. This document explains installation; including it in the package does not automatically add it to an Agent's system prompt.
