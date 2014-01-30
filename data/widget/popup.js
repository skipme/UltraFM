var Radio = {
  refreshInfoId : null,
  Player        : null,

  loadControls: function() {
    Radio.track = {
      artist : document.getElementsByClassName("artist")[0],
      song   : document.getElementsByClassName("song")[0],
      cover  : document.getElementsByClassName("half")
    };
    Radio.buttons = {
      play   : document.getElementsByClassName("play")[0],
      stop   : document.getElementsByClassName("stop")[0],
      vk     : document.getElementsByClassName("vk")[0],
      lastfm : document.getElementsByClassName("lastfm")[0],
      github : document.getElementsByClassName("github")[0]
    };
    Radio.connAnimation = document.getElementById('connecting');
  },
  init: function(){
    Radio.Player = Player;//chrome.extension.getBackgroundPage().Player;

    Radio.loadControls();
    Radio.initButtons();
    Radio.volume.init();
    Radio.setClass();
    Radio.refreshInfo();
    Radio.initScrobbleLink();
  },
  initButtons: function () {
    Radio.buttons.play.onclick = function(e) {
      Radio.changeState('play');
    };

    Radio.buttons.stop.onclick = function() {
      Radio.toggleButton(this);
      Radio.changeState('stop');
    };

    Radio.buttons.vk.onclick     = function () { Radio.toggleButton(this); return false; };
    Radio.buttons.lastfm.onclick = function () { Radio.toggleButton(this); return false; };
    Radio.buttons.github.onclick = function () { Radio.toggleButton(this); return false; };
  },
  toggleButton: function (button) {
    button.classList.add('active');
    setTimeout(function() {
      button.classList.remove('active');
      if (button.href) {
        window.open(button.href,'_newtab');
      }
    }, 100);
  },
  changeState: function(action) {
    if (Radio.Player.paused() && action == 'play') {
      Radio.Player.start();
    } else {
      Radio.Player.stop();
    }
    Radio.setClass();
  },
  setClass: function() {
    if (Radio.Player.paused()) {
      Radio.buttons.play.classList.remove('active');
      // clearInterval(Radio.refreshInfoId);
      Radio.refreshInfo();
    } else {
      // Radio.refreshInfoId = setInterval(Radio.refreshInfo,1000);
      Radio.buttons.play.classList.add('active');
    }
  },
  refreshInfo: function () {
    if (Radio.Player.paused()) {
      Radio.track.artist.innerText = "UltraFM";
      Radio.track.song.innerText   = "stopped";
      Radio.track.cover[0].style.backgroundImage = 'url("images/logo-big.png")';
      Radio.track.cover[1].style.backgroundImage = 'url("images/logo-big.png")';
      Radio.buttons.vk.removeAttribute('href');
      Radio.buttons.lastfm.removeAttribute('href');
      Radio.connAnimation.style.display = 'none';
    } else {
      Radio.connAnimation.style.display = ((Player.radioPlaying && Radio.Player.coverLoaded()) ? 'none':'block');
      var currentTrack = Radio.Player.currentTrack;
      if (currentTrack) {
        Radio.track.artist.innerHTML = currentTrack.artist;
        Radio.track.song.innerHTML   = currentTrack.song;
        var coverUrl = (Radio.Player.coverLoaded()? Radio.Player.cover() : "images/logo-big.png");
        console.log(coverUrl);
        Radio.track.cover[0].style.backgroundImage = 'url("'+coverUrl+'")';
        Radio.track.cover[1].style.backgroundImage = 'url("'+coverUrl+'")';
        Radio.buttons.vk.setAttribute('href', currentTrack.links.vk);
        Radio.buttons.lastfm.setAttribute('href', currentTrack.links.lastfm);
      }
    }
  },
  initScrobbleLink: function() {
    return;
    // var scrobbling = Settings.get('scrobbling');
    // var lastfmConf = CONFIG['lastFM'];
    // var scrobbleLink = document.querySelector('.scrobbling');
    // if (scrobbling['enabled']) {
    //   scrobbleLink.href = 'http://last.fm/user/'+scrobbling['session']['name'];
    //   scrobbleLink.innerText = 'Scrobbled as: ' + scrobbling['session']['name'];
    // } else {
    //   scrobbleLink.href = lastfmConf['authUri']+lastfmConf['key'];
    //   scrobbleLink.innerText = 'Turn on scrobbling?';
    // }
  },
  volume: {
    bar  : null,
    icon : null,
    states: {
      min: 4,
      mid: 5,
      max: 6
    },
    muted : null,
    old   : {
      value: null,
      state: null
    },
    init: function() {
      Radio.volume.bar  = document.querySelector('.volume input');
      Radio.volume.icon = document.querySelector('.volume .icon');
      Radio.volume.loadSettings();

      Radio.volume.setIcon(Radio.volume.bar.value);
      Radio.volume.muted ? Radio.volume.mute() : '';

      Radio.volume.bar.onchange = function(e) {
        var currentVolume = e.target.value;
        Radio.volume.storeParam('value', currentVolume);
        Radio.Player.setVolume(currentVolume);
        Radio.volume.setIcon(currentVolume);
      }
      Radio.volume.icon.onclick = function() {
        Radio.volume.toggleMuted();
        Radio.volume.storeParam('muted', Radio.volume.muted);
        Radio.volume.storeParam('old', Radio.volume.old);
        Radio.Player.setMuted(Radio.volume.muted);
      }
    },
    loadSettings: function() {
      var settings = {};//Settings.get('volume');
      Radio.volume.muted = settings['muted'];
      Radio.volume.bar.value = settings['value'];
      if (settings['muted']) {
        Radio.volume.old = settings['old'];
      }
    },
    toggleMuted: function() {
      if (Radio.volume.muted) {
        Radio.volume.muted = false;
        Radio.volume.unmute();
      } else {
        Radio.volume.muted = true;
        Radio.volume.mute();
      }
    },
    setIcon: function(value) {
      var ivalue = parseInt(value);
      var states = Radio.volume.states;
      Radio.volume.icon.innerHTML = (ivalue > 60 ? states.max : (ivalue > 0 ? states.mid : states.min));
    },
    mute: function() {
      Radio.volume.old.value = Radio.volume.bar.value;
      Radio.volume.old.state = Radio.volume.icon.innerText;
      Radio.volume.bar.value = 0;
      Radio.volume.icon.innerText = Radio.volume.states.min;
      Radio.volume.bar.classList.add('disabled');
    },
    unmute: function() {
      Radio.volume.bar.value = Radio.volume.old.value;
      Radio.volume.icon.innerText = Radio.volume.old.state;
      Radio.volume.bar.classList.remove('disabled');
    },
    storeParam: function(key, value) {
      // var settings = Settings.get('volume');
      // settings[key] = value;
      // Settings.set('volume', settings, true);
    }
  }
};

// setTimeout(Radio.init, 0);
Radio.init();