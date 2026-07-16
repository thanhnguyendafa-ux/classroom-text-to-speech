# Application State Ownership

This document is an enforceable migration contract for the God Component remediation plan.

| State | Single owner | Consumers |
|---|---|---|
| Canonical lesson draft | lesson editor reducer | builder UI, persistence controller |
| Persisted lesson identity, revision, fingerprint | lesson persistence controller | builder UI, navigation guard |
| Save status and conflict | lesson persistence controller | save controls, notifications |
| Playback state | playback reducer/controller | builder, theater, export UI |
| Active speech/audio/countdown resource | playback controller | presentation only |
| Library snapshot | lesson library controller | library views |
| Audio export job | audio export reducer/controller | export modal |
| Recording session | recording controller | theater controls |
| Toast queue | app-shell notification owner | app shell |

## Invariants

- A canonical value is mutated by one owner only.
- Derived values are calculated, not mirrored in another useState.
- UI components emit intents and never persist domain state directly.
- Firebase, provider SDKs, Web Audio, Web Speech and MediaRecorder stay behind repositories or adapters.
- Transitional duplicate state may not survive beyond the extraction commit that removes the previous owner.
- Existing cross-feature exceptions are finite and tracked in `scripts/architecture-boundary-baseline.json`; Phase F must reduce that file to an empty array.
