var stream = function() {
  var domain = 'http://94.25.53.133:80';
  var flow   = '/ultra-128.mp3';
  return {
    domain : domain,
    url    : domain+flow,
    info   : domain+flow+'.xspf'
  };
};

var Player = {
  counter: 0,
  intervalId: 0,
  currentTrack: null,
  previousTrack: '',
  songUpdateIntervalId: 0,

  radioPlaying: false,

  audioElement: function() {
    return document.querySelector('audio');
  },
  start: function() {
    Player.connect();
    // Player.audioElement().addEventListener('error', Player.connect);
    // Player.intervalId = setInterval(Player.animate, 1500);
    Player.fetchSongName();
    Player.songUpdateIntervalId = setInterval(Player.fetchSongName, 10000);
  },
  stop: function() {
    Player.audioElement().pause();
    Player.audioElement().removeEventListener('error', Player.connect, false);
    Player.audioElement().src = null;
    clearInterval(Player.intervalId);
    clearInterval(Player.songUpdateIntervalId);
    if (Player.currentTrack) {
      Player.scrobble([Player.currentTrack.artist, Player.currentTrack.song]);
      Player.currentTrack = null;
    }
    // chrome.browserAction.setBadgeText({text:''});
  },
  paused: function() {
    return Player.audioElement().paused;
  },
  currentTime: function() {
    return Player.audioElement().currentTime;
  },
  coverLoaded: function() {
    console.log("cover loaded", lastfmData.imgComplete)
      return lastfmData.imgComplete;
  },
  connect: function() {
    Player.audioElement().src = stream().url+'?nocache='+Math.floor(Math.random() * 100000);
    Player.radioPlaying = false;
    Player.audioElement().onplaying = function()
    {
      console.log("audio playing...")
      Player.radioPlaying = true;
      Radio.refreshInfo();
    };
    Player.audioElement().onwaiting = function()
    {
      console.log("audio waiting...")
      Player.radioPlaying = false;
      Radio.refreshInfo();
    };
    Player.audioElement().onerror= function()
    {
      console.log("audio error...")
      Player.radioPlaying = false;
      Radio.refreshInfo();
    };
    Player.audioElement().play();
  },
  animate: function() {
    var animation = ["....:",":..::","..::.",":.:.:","::.:.",":.:..",".:.:.",":.:.:","::.:.","..:::","..:..",":..:.","..:.:","...::",":.::.",".::::","..::.",":.::.",":..:.",".:::."];
    if(Player.counter < 19){
      Player.counter += 1;
    }
    else{
      Player.counter = 0;
    }
    // chrome.browserAction.setBadgeText({text:animation[Player.counter]});
  },
  fetchSongName: function() {
    playlist.parseXml = true;
    playlist.download();
  },
  cover: function() {
    return lastfmData.coverImageUrl();
  },
  scrobble: function(track) {
    if (track && Settings.get('scrobbling')['session']['key']) {
      var ts = Math.floor(new Date().getTime()/1000);
      lastfm.track.scrobble({artist: track[0], track: track[1], timestamp: ts}, {key: Settings.get('scrobbling')['session']['key']}, {});
    }
  },
  updNowPlaying: function(track) {
    // if (track && Settings.get('scrobbling')['session']['key']) {
    //   lastfm.track.updateNowPlaying({artist: track[0], track: track[1]}, {key: Settings.get('scrobbling')['session']['key']}, {});
    // }
  },
  setVolume: function(value) {
    Player.audioElement().volume = parseInt(value) / 100;
  },
  setMuted: function(value) {
    Player.audioElement().muted = value;
  }
};

var playlist = {
  parseXml : false,

  download: function (force) {
    var destination = function() {
      return (playlist.parseXml ? stream().info : stream().domain);
    };
    self.port.emit('takexml', destination());
  },
  parse: function (response, responseXML) {
    // if (response) {
      

      var track;
      // if (playlist.parseXml) {
        track = _parseXml(responseXML).querySelector('track > title').textContent;
      // } else {
      //   track = response.split('streamdata">').pop().split('\</td')[0];
      // }

      if (!Player.currentTrack || track !== Player.currentTrack.origin) {
        Player.previousTrack = (Player.currentTrack ? Player.currentTrack.origin : null);
        var newTrack = track.split(" - ");
        var oldTrack = (Player.previousTrack ? Player.previousTrack.split(' - ') : null);
        lastfmData.init(newTrack);

        // Player.scrobble(oldTrack); // lastfm
        // Player.updNowPlaying(newTrack); // lastfm

        var encode = function(string) {
          return escape(string.replace(/\s/g, '+'));
        };
        Player.currentTrack = {
          origin : track,
          artist : newTrack[0],
          song   : newTrack[1],
          links  : {
            vk     : 'http://vk.com/audio?q='+escape(track),
            lastfm : 'http://last.fm/music/'+encode(newTrack[0])+'/_/'+encode(newTrack[1])
          }
        };
        Radio.refreshInfo();
      }
    // } else {
    //   Player.currentTrack = null;
    // }
  }
};
var lastfmData = {
  artist  : null,
  song    : null,
  cover   : null,
  img: null,

  imgComplete: false,
  imgCompleteUrl: null,

  init: function (trackArray) {
    this.artist = trackArray[0];
    this.song   = trackArray[1];
    this.fetchCover('track');
  },
  fetchCover: function(type, size) {
    if(type == "artist")
    {
      self.port.emit('lastfm_artistinfo', {artist: this.artist});
    }else if(type == "track")
    {
      self.port.emit('lastfm_trackinfo', {artist: this.artist, track: this.song});
    }
  },
  coverImageUrl: function(){
    if (this.imgComplete) {
      return this.imgCompleteUrl;
    }
    return null;
  },
  preloadCover: function() {
    // var imageHolder = document.querySelector("div.half");
    if (this.cover) {

      if(this.img !== null &&  typeof this.img !== 'undefined')
        delete this.img;

      this.img = new Image(); 
      

      this.img.onload = function(){
         lastfmData.imgComplete = true;
         lastfmData.imgCompleteUrl = lastfmData.img.src;
         Radio.refreshInfo();
      };
      this.imgComplete = false;
      this.img.src = this.cover;
    }
  }
};

// Settings.default();
// setTimeout(function(){
//   if (Player.paused()) {
//     Player.stop();
//   }
// },2000);

var _parseXml;

if (window.DOMParser) {
    _parseXml = function(xmlStr) {
        return ( new window.DOMParser() ).parseFromString(xmlStr, "text/xml");
    };
} else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM")) {
    _parseXml = function(xmlStr) {
        var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(xmlStr);
        return xmlDoc;
    };
} else {
    _parseXml = function() { return null; }
}

self.port.on("herexml", function(xml){
      playlist.parse({}, xml);
});
self.port.on("here_trackinfo", function(json){
        if(typeof json.error !== "undefined" 
          || typeof json.track === "undefined" 
          || typeof json.track.album === "undefined")
        {
           lastfmData.fetchCover('artist');
           return;
        }
        var coverTag = retrieveCover(json.track.album.image, 3);
        if (coverTag && coverTag["#text"]) {
          lastfmData.cover = coverTag["#text"];
        } else
        {
          lastfmData.fetchCover('artist');
        } 

        lastfmData.preloadCover();
});
self.port.on("here_artistinfo", function(json){
        if(typeof json.error !== "undefined"
          || typeof json.artist === "undefined")
        {
          return;
        }
        var coverTag = retrieveCover(json.artist.image, 3);
        if (coverTag && coverTag["#text"]) {
          lastfmData.cover = coverTag["#text"];
        }
        lastfmData.preloadCover();
});
function retrieveCover(arrayCovers, predefIndex)
{
  if(arrayCovers.length <= predefIndex)
    predefIndex = arrayCovers.length -1;
  if(predefIndex < 0)
    return arrayCovers.length === 0 ? null : arrayCovers[0];
  return arrayCovers[predefIndex];
}
