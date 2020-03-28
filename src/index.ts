require('dotenv').config()

import express from "express";
import bodyParser from "body-parser";

import { sentimentScore } from "../lib/sentiment";

import { Client } from '@elastic/elasticsearch';
const client = new Client({ node: 'http://localhost:9200' })

// Slack bits
const { WebClient } = require('@slack/web-api');
const token = process.env.SLACK_TOKEN;
const web = new WebClient(token);

// 2. integrate https://github.com/slackapi/node-slack-sdk

const app = express();
const port = 8080; // default port to listen

app.use(bodyParser());

export interface ISlackMessageEvent {
  type: string,
  channel: string,
  user: string,
  text: string,
  ts: string
}

// define a route handler for the default home page
app.get("/", (req, res) => {
  res.send("Hello world!");
});

app.post("/webhooks/slack", (req, res) => {
  if(req.body.event.subtype) {
    return res.send("Not responding");
  }

  //console.log(req.body)
  
  const slackMessageEvent = req.body.event as ISlackMessageEvent;

  const messageSentiment = sentimentScore(slackMessageEvent.text);

  const splitMessageDate = slackMessageEvent.ts.split(".")[0];
  // No idea why we need to multiply this, but it works!
  const messageDate = new Date(parseInt(splitMessageDate) * 1000);

  client.index({
    index: 'slack-messages',
    // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
    body: {
      ...slackMessageEvent,
      sentimentScore: messageSentiment,
      messageDate
    }
  }, (err: any, result: any) => {
    if (err) console.log(err, result)
  })


  // // REACT! not that one
  console.log(`Sentiment: ${messageSentiment} for ${slackMessageEvent.text}`);

  if (Math.abs(messageSentiment) > 1) {
    const reactionName = messageSentiment > 0 ? "thumbsup" : "cry";

    // See: https://api.slack.com/methods/chat.postMessage
    web.reactions.add({ channel: slackMessageEvent.channel, timestamp: slackMessageEvent.ts, name: reactionName });
    console.log('Message sent: ', `Replied with :${reactionName}: to "${slackMessageEvent.text}"`);
  }

  // TODO: one after the other....

  // Overall sentiment
  client.search({
    index: 'slack-messages',
    body: {
      aggs: {
        avg_sentiment: { 
          avg : { field : "sentimentScore" } }
      },
      query: {
        match_all: {}
      },
      sort: [
        {
          messageDate: 'desc'
        }
      ],
      from: 0,
      size: 5
    }
  } , (err, result) => {
    if (err) console.log(err, result);
    // TODO: catch when no data/average is present
    console.log(`Average sentiment: ${result.body.aggregations.avg_sentiment.value}`);
  });

  // res.send(req.body.challenge);
  res.send("OK");

})

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});