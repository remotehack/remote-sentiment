require('dotenv').config()

import express from "express";
import bodyParser from "body-parser";

import { sentimentScore } from "../lib/sentiment";
import { infringements } from "../lib/sentiment";

import { addSeconds, isAfter } from "date-fns";

import { Client } from '@elastic/elasticsearch';
const client = new Client({ node: 'http://localhost:9200' })

// Slack bits
import { WebClient } from '@slack/web-api';
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

const lastPromptCache = {

}

// define a route handler for the default home page
app.get("/", (req, res) => {
  res.send("Hello world!");
});

app.post("/webhooks/slack", (req, res) => {
  if (req.body.event.subtype) {
    return res.send("Not responding");
  }

  console.log(req.body)
  
  const slackMessageEvent = req.body.event as ISlackMessageEvent;

  const messageSentiment = sentimentScore(slackMessageEvent.text);

  const splitMessageDate = slackMessageEvent.ts.split(".")[0];
  // No idea why we need to multiply this, but it works!
  const messageDate = new Date(parseInt(splitMessageDate) * 1000);
  
  client.index({
    index: 'slack-messages',
    // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
    body: {
      //...slackMessageEvent, // Let's not store personal messages in ES
      sentimentScore: messageSentiment,
      messageDate,
      channel: slackMessageEvent.channel
    }
  }, (err: any, result: any) => {
    if (err) console.log(err, result)
  })


  // // REACT! not that one
  console.log(`Sentiment: ${messageSentiment} for ${slackMessageEvent.text}`);

  if (Math.abs(messageSentiment) > 1) {
    const reactionName = messageSentiment > 0 ? "green_heart" : "cry";

    // See: https://api.slack.com/methods/chat.postMessage
    web.reactions.add({ channel: slackMessageEvent.channel, timestamp: slackMessageEvent.ts, name: reactionName });
    console.log('Message sent: ', `Replied with :${reactionName}: to "${slackMessageEvent.text}"`);
  }

  // TODO: one after the other....
  // TODO: also bucket by channel
  // Overall sentiment
  client.search({
    index: 'slack-messages',
    body: {
      aggs: {
        avg_sentiment: {
          avg: { field: "sentimentScore" }
        }
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
  }, (err, result) => {
    if (err) console.log(err, result);
    // TODO: catch when no data/average is present
    const averageSentiment = result.body.aggregations.avg_sentiment.value;
    console.log(`Average sentiment: ${averageSentiment}`);

    // Some arbitrary cut off for negativity
    const lastPromptDate = lastPromptCache[slackMessageEvent.channel];
    const nextAllowedPromptDate = addSeconds(lastPromptDate, 30);
    if (messageSentiment < 0 && averageSentiment < 0 && (!lastPromptCache[slackMessageEvent.channel] || isAfter(new Date(), nextAllowedPromptDate))) {
      web.chat.postMessage({ channel: slackMessageEvent.channel, text: "This channel seems to be quite upset, maybe consider jumping on a call with pictures of bunnies" })
      lastPromptCache[slackMessageEvent.channel] = new Date();
    }
  });

  // EVEN LONGER METHOD
  infringements([slackMessageEvent.text]).then((infringementArray) => {
    web.chat.postMessage({ channel: slackMessageEvent.channel, text: `It looks like you're being mean. You've been flagged for ${infringementArray.join(', ')}` })
  })


  // res.send(req.body.challenge);
  res.send("OK");

})

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});