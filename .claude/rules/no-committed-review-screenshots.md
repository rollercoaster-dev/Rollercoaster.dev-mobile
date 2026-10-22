# Review screenshots go in the PR description, never in git

Verification screenshots and recordings (simulator captures, before/after shots, Maestro screenshots) are PR evidence, not repo content. They live in exactly one place: the PR description, uploaded with `gh --attach`.

## Rules

- **Never commit** a review capture. Not under `apps/native-rd/e2e/reports/`, not under `docs/`, not anywhere. `.gitignore` blocks image and video files in `e2e/reports/`; do not `git add -f` past it. Keep captures in the gitignored `tmp/native-verify/<issue-or-pr>/`.
- **Never hotlink** `raw.githubusercontent.com/...` or `github.com/.../blob/<sha>/...png` from a PR body. That only works because the file was committed.
- **Never post** captures as a separate PR or issue comment. Evidence goes in the body, where reviewers read it.
- **Upload with gh ≥ 2.99.** Reference each capture by local path in the body file, then pass it with `--attach`; gh uploads it and rewrites the reference to a `user-attachments` URL:

  ```bash
  # body.md contains: ![Fix shows 2 badges](./fix-2-badges.png)
  gh pr create --repo rollercoaster-dev/Rollercoaster.dev-mobile ... \
    --body-file /abs/tmp/native-verify/699/body.md \
    --attach /abs/tmp/native-verify/699/fix-2-badges.png
  # later captures on an existing PR:
  gh pr edit <number> --repo rollercoaster-dev/Rollercoaster.dev-mobile \
    --body-file /abs/path/body.md --attach /abs/path/after.png
  ```

  Paths in `--body-file` resolve relative to that file's directory. Use Markdown image syntax `![alt](./file.png)`, the form gh documents rewriting. Max 50 files per call. Check `gh --version` first; below 2.99 has no `--attach`, so upgrade (`brew upgrade gh`) rather than fall back to committing.

- Tracked run records (`e2e/reports/**/index.md`, JUnit XML) stay. A report that needs to show a capture links to the PR whose description holds it.

## Exceptions

Design reference images that are part of the docs themselves (`apps/native-rd/docs/design/screenshots/`, research write-ups) are content, not review evidence. This rule covers captures whose only purpose is proving a PR.

## Origin

#708–#711 and #740 (Oct 2026) committed verification captures into `apps/native-rd/e2e/reports/issue-*/` and hotlinked them from PR bodies by SHA; #685/#687/#699 shipped twelve to main. #708 additionally posted six captures as a PR comment. The cleanup moved those captures into PR bodies with `gh pr edit --attach` and deleted them from the tree.
