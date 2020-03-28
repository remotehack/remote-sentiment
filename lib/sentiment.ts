// Convert contractions into lexical form (I'm -> I am)
const aposToLexForm = require('apos-to-lex-form');
const natural = require('natural');
const StopWord = require('stopword')

import * as tf from '@tensorflow/tfjs';

import * as toxicity from '@tensorflow-models/toxicity';

let createdModel;

toxicity.load(0.9, ["toxicity", "severe_toxicity", "identity_attack", "insult", "threat", "sexual_explicit", "obscene"]).then((model) => {
  createdModel = model;

  neuralSentimentScore(["You suck"]).then(console.log)
})



export function sentimentScore(message: string): number {
  const lexedMessage = aposToLexForm(message).toLowerCase();
  const alphaOnlyMessage = lexedMessage.replace(/[^a-zA-Z\s]+/g, '');

  const { WordTokenizer } = natural;
  const tokenizer = new WordTokenizer();
  const tokenizedMessage = tokenizer.tokenize(alphaOnlyMessage);

  // TODO: spelling correction *maybe*
  const filteredMessage = StopWord.removeStopwords(tokenizedMessage);

  const { SentimentAnalyzer, PorterStemmer } = natural;
  const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
  const sentimentScore = analyzer.getSentiment(filteredMessage);

  return sentimentScore;
}

export async function infringements(message: string[]): Promise<string[]> {
  const results = await createdModel.classify(message);
  console.log(JSON.stringify(results));
  const infringements = results
    .filter(results => results.results[0].match)
    .map(result => result.label);

  return infringements;
}