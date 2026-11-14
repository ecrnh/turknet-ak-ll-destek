# Workflow boundaries

- Only presenter controls/scenarios may call `startOutage`; support services reuse `openOutage` without creating one, and hydration discards legacy unmarked outages then synchronizes the app status. Why: support navigation and old snapshots must not simulate a new internet interruption.