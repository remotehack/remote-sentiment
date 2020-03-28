// Convert contractions into lexical form (I'm -> I am)
const aposToLexForm = require('apos-to-lex-form');
const natural = require('natural');
const StopWord = require('stopword')


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




// hacky mchackface
function main(): void {
  const unhappyMessage: string = "Hey, this is terrible, I can't believe how rubbish it is";
  const happyMessage: string = "I really appreciate how nice things are right now";

  console.log(sentimentScore(unhappyMessage));
}

main();