require('dotenv').config()

import express from "express";
import bodyParser from "body-parser";

import { sentimentScore } from "../lib/sentiment";

const { Client } = require('@elastic/elasticsearch')
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
  const slackMessageEvent = req.body.event as ISlackMessageEvent;

  const messageSentiment = sentimentScore(slackMessageEvent.text);

  const splitMessageDate = slackMessageEvent.ts.split(".")[0];
  // No idea why we need to multiply this, but it works!
  const messageDate = new Date(parseInt(splitMessageDate) * 1000);
  
  client.index({
      index: 'slack-messages',
      // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
      body: {
          rawSlackMessage: slackMessageEvent,
          message: slackMessageEvent.text,
          sentimentScore: messageSentiment
      }
    }, (err: any, result: any) => {
      if (err) console.log(err, result)
    })


    // // REACT! not that one
    if (Math.abs(messageSentiment) > 1) {
      const reactionName = messageSentiment > 0 ? "thumbsup" : "cry";

      // See: https://api.slack.com/methods/chat.postMessage
      web.reactions.add({ channel: slackMessageEvent.channel, timestamp: slackMessageEvent.ts, name: reactionName });
      console.log('Message sent: ', `Replied with :${reactionName}: to "${slackMessageEvent.text}"`);
    }
    

    // res.send(req.body.challenge);
    res.send("OK");
    
})

// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});