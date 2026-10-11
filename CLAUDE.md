# Claude Code in Farm Village

@AGENTS.md

Since 2026-10-10 Claude Code does both the art and the logic here (the two-lane split with Codex described further down
in `AGENTS.md` is how the project began; read it for the rules it set, not for who does what).

- The plan is `docs/plan/README.md`: one file per step, with what was built and what is left. The story is complete
  (chapters 1 to 20); what is open is `docs/plan/95-review.md`, then `docs/plan/90-release-pass.md`.
- Work in the worktree `../Farm_village-claude`, one branch and one pull request per step. Leave `../Farm_village-art`
  and `../Farm_village-items` alone. A merge to `main` deploys the live game: run `npm test`, the browser smoke suite
  and the browser suites first.
- `node_modules` in the Claude worktrees is a link into `../Farm_village-art`: never delete a worktree folder without
  unlinking it first.
