const net = require('net');
const fs = require('fs');
const { parse } = require('url');
const { messageExtractor } = require('./messageDecoder');
const searchQuestions = require('../inquirer/search');
const finishedQuestion = require('../inquirer/postDownload');

// Factory Method pattern. Looks nicer than switch/case
// statements
const board = new Proxy({
  '11': search,
  '12': download,
  '03': upload
}, {
  get: function(obj, prop) {
    // create a default value if the code is not found
    // return a function that does nothing
    return prop in obj ? obj[prop] : async() => { };
  }
});

async function search(message, clients) {
  const answer = await searchQuestions(message);
  clients.client.write(`!02!${answer}%02%`);
}

async function download(message, clients) {
  const { client } = clients;
  const { url, songTitle, songPath } = JSON.parse(message);
  const { hostname, port } = parse(url);
  const downloadPackage = { songTitle, songPath };
  const downloadingClient = net.createConnection(port, hostname, () => {
    downloadingClient.write(`!03!${JSON.stringify(downloadPackage)}%03%`);
  });
  const writeStream = fs.createWriteStream(`${client.savePath}/${songTitle}`);
  downloadingClient.pipe(writeStream);
  downloadingClient.on('end', async() => {
    await finishedQuestion();
    client.write('!05!%05%');
  });
}

async function upload(message, clients) {
  const { songPath } = JSON.parse(message);
  const fileRead = fs.createReadStream(songPath);
  fileRead.pipe(clients.downloadClient);
}

module.exports = async(result, client, downloadClient) => {
  const { messageCode, message } = messageExtractor(result);
  board[messageCode](message, { client, downloadClient });
};
