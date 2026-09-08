# dsh-osc

DeepSeek Harness bundle for open-source collaboration (`@ruyiAi/dsh-osc`).

Install into a profile:

```sh
pnpm dsh plugin --profile web add @ruyiAi/dsh-osc@0.1.0
```

Then set secrets in the profile patch (`$DSH_HOME/profiles/web/cordis.patch.yml`): `github-bot.orgs`, hook `secret` / `token`. Shipped bundle defaults are empty on purpose.

## Packages

| Package | Role |
|---|---|
| `@ruyiAi/dsh-osc` | meta-bundle (`dsh.bundle`) |
| `@ruyiAi/dsh-osc-role` | GitHub identity / repoList |
| `@ruyiAi/dsh-osc-collaboration-panel` | board HTTP + web client |
| `@ruyiAi/dsh-osc-github-bot` | App commit / PR tools |
| `@ruyiAi/dsh-osc-hook-github` | GitHub webhook |
| `@ruyiAi/dsh-osc-hook-zulip` | Zulip webhook |
| `@ruyiAi/dsh-osc-pr-chat` | PR comment path |

## Develop (as ruyi submodule)

`devDependencies` link `@deepseek-ai/*` into `ruyi/thirdparty/deepseek-harness`. From this directory:

```sh
pnpm install
pnpm build
```
