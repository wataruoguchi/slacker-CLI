# Slacker CLI

The CLI that helps you managing your Slack workspace.

## Functionalities

- It archives channels that have no post last one month.

## Usage

### Create a Slack App (bot)

Create a Slack App in your Slack admin console.

1. "Settings & Administration" > "Manage apps"
1. Select "Build" on top-right corner.
1. You'd be redirected to `https://api.slack.com/apps/`
1. "Create New App"
1. Set name and stuff.
1. Give the following Bot Token Scopes and install.

```markdown
- channels:history
- channels:join
- channels:manage
- channels:read
```

### Run CLI

Set your SLACK_TOKEN and run the CLI. `dryRun` option is `1`(true) by default. When you're ready to archive channels, set `0`.

```shell
SLACK_TOKEN=xoxb-1234567890 slacker --dryRun=1
```
