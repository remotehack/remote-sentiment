import express from "express";
import bodyParser from "body-parser";

import { sentimentScore } from "../lib/sentiment";

const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: 'http://localhost:9200' })

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
  console.log(req.body);
  const slackMessageEvent = req.body.event as ISlackMessageEvent;

  const messageSentiment = sentimentScore(slackMessageEvent.text);

  const splitMessageDate = slackMessageEvent.ts.split(".")[0];
  // No idea why we need to multiply this, but it works!
  const messageDate = new Date(parseInt(splitMessageDate) * 1000);
  console.log(messageDate);
  
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

    // res.send(req.body.challenge);
    res.send("OK");
    
})

// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});