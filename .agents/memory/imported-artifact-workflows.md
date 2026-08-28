---
name: Imported artifact workflows
description: Avoiding workflow and port conflicts when imported artifacts become registered after initial setup.
---

Use the managed `artifacts/<slug>: <service>` workflows once imported artifacts are registered. Remove any legacy workflows created earlier for the same frontend or API.

**Why:** Artifact registration can happen after initial import setup. If legacy workflows remain, Vite may silently move to another port and the API may fail with `EADDRINUSE`, producing a blank or unreliable preview.

**How to apply:** Before restarting an imported app, list workflows and check for duplicate commands serving the same artifact. Keep the managed artifact workflows and restart those exact names.