# Production Operations Runbook

## Release gate

A release candidate is eligible only when all commands exit with code 0:

```powershell
npm ci
npm run lint
npm test
npm run test:rules
npm run build
```

Deploy only the artifact produced by that exact build. Record the Git SHA and deployment identifier together.

## Health verification

After deployment:

1. Call `GET /api/health` and require `status: ok` plus `firestore: connected`.
2. Open the lesson library, load a lesson, edit it, save it, refresh, and confirm the revision persists.
3. Verify browser playback pause/resume/stop and one Premium TTS request.
4. Confirm structured logs contain JSON events and no credentials or lesson text.
5. Confirm the configured error-monitor webhook receives a sanitized test event in staging.

## Rollback triggers

Rollback immediately when any of these occurs:

- Health endpoint is not healthy after two consecutive checks.
- Authentication, lesson load/save, or playback fails for the primary flow.
- Error rate or HTTP 5xx rate materially exceeds the previous release.
- Firestore rules reject valid owner operations or allow cross-user access.
- A release creates incompatible lesson documents or loses revision information.

## Rollback procedure

1. Stop promotion and preserve logs, deployment ID, Git SHA, and failing request correlation data.
2. Route traffic to the most recent verified artifact; do not rebuild an old commit with new dependencies.
3. Re-run the health and primary-flow checks above against the restored deployment.
4. If data writes changed shape, keep readers backward-compatible and disable the new writer before rollback. Never delete or rewrite user documents as part of an application rollback.
5. Create a forward-fix from the failing SHA. Do not force-push or rewrite `main`.

## Data recovery

- Lesson documents use `schemaVersion` and `revision`; reject stale updates instead of overwriting them.
- Local library backups use the versioned export contract and canonical hydration on import.
- Delete cleanup failures retain retryable tombstones rather than reporting false success.
- Restore from user export or provider backup into a separate environment first, validate counts and revisions, then promote.

## Monitoring configuration

Set `ERROR_MONITOR_WEBHOOK_URL` to an HTTPS endpoint owned by the deployment environment. Reporting is best-effort and never blocks a user request. Payloads are sanitized by the same redaction boundary used by structured logging.
