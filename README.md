# remote-sentiment
Remote Hack sentiment analysis for Slack (https://github.com/remotehack/remotehack.github.io/issues/8)

This was created with @mikerhyssmith for the [Remote Hack 

THIS IS VERY MUCH NOT FOR PRODUCTION.

## Prerequisites

- Docker
- Node, NPM

## Running locally

We use Docker Compose to fire up supporting services (like ElasticSearch), though the main app doesn't run in Docker. This was a hack, after all.

```
docker-compose up -d
npm install
npm run start:watch
```

## Testing locally with Slack

1. [Create a Slack App](https://api.slack.com/apps)
  - Add the `channels:history`, `chat:write`, `incoming-webhook` and `reactions:write` scopes
2. Install the app into your Slack, and associate it with a channel.