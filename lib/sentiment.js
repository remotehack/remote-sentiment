// Convert contractions into lexical form (I'm -> I am)
var aposToLexForm = require('apos-to-lex-form');
var natural = require('natural');
// hacky mchackface
function main() {
    var unhappyMessage = "Hey, this is terrible, I can't believe how rubbish it is";
    var happyMessage = "I really appreciate how nice things are right now";
    var lexedMessage = aposToLexForm(unhappyMessage).toLowerCase();
    var alphaOnlyMessage = lexedMessage.replace(/[^a-zA-Z\s]+/g, '');
    var WordTokenizer = natural.WordTokenizer;
    var tokenizer = new WordTokenizer();
    var tokenizedMessage = tokenizer.tokenize(alphaOnlyMessage);
    // TODO: spelling correction *maybe*
}
function sentimentScore(message) {
    return 1.0;
}
main();
