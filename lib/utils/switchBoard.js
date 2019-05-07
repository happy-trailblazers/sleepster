const Song = require('../models/Song');
const { messageExtractor } = require('./messageDecoder');
const { songLookup } = require('./serverTools');

// Factory Method pattern. Looks nicer than switch/case
// statements
const board = new Proxy({
  '01': uploadSongList,
  '02': lookupSong,
  '05': lookupSongList
}, {
  get: function(obj, prop) {
    // create a default value if the code is not found
    // return a function that does nothing
    return prop in obj ? obj[prop] : async() => { };
  }
});

async function uploadSongList(message, client) {
  const { files, url } = JSON.parse(message);
  client.url = url;
  for(let i = 0; i < files.length; i++) {
    const {
      songPath,
      title,
      album,
      artist
    } = files[i];
    await Song.create({
      songPath,
      title,
      album,
      artist,
      url
    });
  }
  const masterSongList = await Song.find().lean();
  client.write(`!11!${JSON.stringify(masterSongList)}%11%`);
}

async function lookupSong(songId, client) {
  songLookup(songId, client);
}

async function lookupSongList(message, client) {
  const masterSongList = await Song.find().lean();
  client.write(`!11!${JSON.stringify(masterSongList)}%11%`);
}

async function switchBoard(result, client) {
  const { messageCode, message } = messageExtractor(result);
  board[messageCode](message, client);
}

module.exports = switchBoard;
