// (function(){

	var Player = {
		
		state: {
			volumeLevel: 0,
			streamSource: null,
			isMute: false,
			ensureSource: function(){
				if(typeof this.streamSource === 'undefined' || 
					this.streamSource === null)
				{
					return false;
				}else
				if(typeof this.audioElement.src === 'undefined' || 
					this.audioElement.src === null|| 
					this.audioElement.src === '')
				{
					this.audioElement.src = this.streamSource;
					return true;
				}else return true;
			},
			playingStream: false,
			waitingStream: false,
			errorStream: false,
			audioElement: null,
			onStateChange: null,

			connecting: function(){
				this.playingStream = false; 
				this.waitingStream = true;
				this.errorStream = false;
				this.invokeStateChangeCallback();
			},
			playing: function(){
				this.playingStream = true; 
				this.waitingStream = false;
				this.errorStream = false;
				this.invokeStateChangeCallback();
			},
			waiting: function(){ 
				this.waitingStream = true;
				this.errorStream = false;
				this.invokeStateChangeCallback();
			},
			error: function(){ 
				this.playingStream = false; 
				this.waitingStream = false;
				this.errorStream = true;
				this.invokeStateChangeCallback();
			},
			stopped: function(){ 
				this.playingStream = false; 
				this.waitingStream = false;
				this.errorStream = false;
				this.invokeStateChangeCallback();
			},
			isConnected: function(){
				return this.playingStream || this.waitingStream;
			},
			invokeStateChangeCallback: function(){
				_callQuasiFunction(this.onStateChange, Player, Player.state);
			},
			stateString: function(){
				
				if(this.playingStream)
					return "playing" + (this.waitingStream?", waiting":"");
				else if(this.errorStream)
					return "error";
				else if(this.waitingStream)
					return "waiting";
				else 
					return "stopped";
			}
		},
		setStateChangeCallback: function(callback){
			this.state.onStateChange = callback;
		},
		setSource: function(streamUrl){
			this.state.streamSource = streamUrl;
			this.state.audioElement.src = streamUrl;
		},
		play: function (callback){
			if(typeof callback !== "undefined")
				this.setStateChangeCallback(callback);

			if(this.state.isConnected())
			{
				this.stop();
			}
			if(this.state.ensureSource())
			{
				this.state.connecting();
				this.state.audioElement.play();
			}else{
				console.error("set source before playing...");
			}
		},
		stop: function (){			
			this.state.audioElement.pause();
			this.state.audioElement.src = '';
			this.state.audioElement.removeAttribute("src");
			this.state.stopped();
		},
		setVolume: function(val){
			this.state.audioElement.volume = parseInt(val) * .01;
			this.state.volumeLevel = parseInt(val);
		},
		setMute: function(mute){
			this.state.audioElement.muted = mute;
			this.state.isMute = mute;
		},
		isPlaying: function (){
			return this.state.playingStream;
		},
		isWaiting: function (){
			return this.state.waitingStream;
		},
		initialise: function (){
		 this.state.audioElement = document.querySelector('audio#player-audio');
		 var a = this.state.audioElement;
		 a.addEventListener("playing", function() {Player.state.playing(); } );
		 a.addEventListener("waiting", function() {Player.state.waiting(); } );
		 a.addEventListener("error", function(e) { Player.stop(); Player.state.error(); } );
		 // a.addEventListener("canplay", function(e) {console.log('canplay'); } );

		 a.addEventListener("suspend", function() {Player.state.stopped(); } );
		 a.addEventListener("ended", function() {Player.state.stopped(); } );
		 a.addEventListener("stalled", function() {Player.state.waiting(); } ); 
		 
		 a.addEventListener("abort", function() {Player.state.stopped(); } ); 

		 a.addEventListener("loadstart", function() {Player.state.waiting(); } );
		 // a.addEventListener("progress", function(e) { console.log("progress", e); } );
		},

	};
	var CoverImageLoader = {
		loadingCallback: null,
		loadingCoverImage: false,
		img: null,
		setStateChangeCallback: function(onChange){
			this.onStateChange = onChange;
		},
		getCoverImage: function(url, onLoad){
			if(this.loadingCoverImage)
			{
				_callQuasiFunction(onLoad, null, -1, {error: 1});
				return;
			}
			this.loadingCoverImage = true;

			if(this.img !== null &&  typeof this.img !== 'undefined')
			    delete this.img;

		    this.img = new Image(); 
		    this.img.onload = function(){
		        CoverImageLoader.loadingCoverImage = false;
		        _callQuasiFunction(CoverImageLoader.onStateChange, null);
		        _callQuasiFunction(onLoad, null, 200, {url: url});
		    };
		    this.img.onerror = function(){
		        CoverImageLoader.loadingCoverImage = false;
		        _callQuasiFunction(CoverImageLoader.onStateChange, null);
		        console.log("image url error", url);
		    };
		    this.img.src = url;
		}
	};
	var LastFM = {
		loadingCallback: null,
		loadingCover: false,

		onStateChange: null,
		trackRequest: null,

		setStateChangeCallback: function(onChange){
			this.onStateChange = onChange;
		},

		getCover: function (artist, track, onLoad){
			if(this.loadingCover)
			{
				_callQuasiFunction(onLoad, null, -1, {error: 1});
				return;
			}
			this.loadingCover = true;
			this.loadingCallback = onLoad;
			this.trackRequest = {artist: artist, track: track}; 
			portMocking.requestLastFMTrack(artist, track);
			_callQuasiFunction(this.onStateChange, null);
		},
		portTrack: function(status, data){
			if(status === 200)
			{
				this.loadingCover = false;
				_callQuasiFunction(this.onStateChange, null);
				data = (status === 200? {url: this.retrieveCover(data.track.album.image, 3)}: {error: 1});
				_callQuasiFunction(this.loadingCallback, null, status, data);
			}
			else{
				portMocking.requestLastFMArtist(this.trackRequest.artist);
			}
		},
		portArtist: function(status, data){
			this.loadingCover = false;
			_callQuasiFunction(this.onStateChange, null);

			data = (status === 200? {url: this.retrieveCover(data.artist.image, 3)}: {error: 1});
			_callQuasiFunction(this.loadingCallback, null, status, data);
			
		},
		retrieveCover: function (arrayCovers, predefIndex)
		{
		  if(arrayCovers.length <= predefIndex)
		    predefIndex = arrayCovers.length -1;
		  if(predefIndex < 0)
		    return arrayCovers.length === 0 ? null : arrayCovers[0]["#text"];
		  return arrayCovers[predefIndex]["#text"];
		}
	};

	var XSPF = {
		loadingCallback: null,
		loadingXSPF: false,
		onStateChange: null,

		setStateChangeCallback: function(onChange){
			this.onStateChange = onChange;
		},
		getXSPFdata: function(onLoad){
			if(this.loadingXSPF)
			{
				_callQuasiFunction(onLoad, null, -1, {waiting: 1});
				return;
			}
			this.loadingXSPF = true;
			this.loadingCallback = onLoad;
			portMocking.requestXSPF();
			_callQuasiFunction(this.onStateChange, null);
		},
		parseXSPFdata: function(string){
			var xspf = _parseXml(string);
			var track = xspf.querySelector('track > title').textContent;
			var artistAndTitle = track.split(" - ");

			return {artist: artistAndTitle[0], title: artistAndTitle[1]};
		},
		portXSPF: function(status, data){
			this.loadingXSPF = false;
			_callQuasiFunction(this.onStateChange, null);

			data = (status === 200? this.parseXSPFdata(data): {error: 1});
			_callQuasiFunction(this.loadingCallback, null, status, data);
		}
	};

	var M3U = {
		loadingCallback: null,
		loadingM3U: false,
		onStateChange: null,

		setStateChangeCallback: function(onChange){
			this.onStateChange = onChange;
		},
		getM3Udata: function(onLoad){
			if(this.loadingM3U)
			{
				_callQuasiFunction(onLoad, null, -1, {error: 1});
				return;
			}
			this.loadingM3U = true;
			this.loadingCallback = onLoad;
		}
	};

	var _parseXml = function(xmlStr) {
        return ( new window.DOMParser() ).parseFromString(xmlStr, "text/xml");
    };
    var _isFunction = function(quasi){
    	return (typeof quasi !== "undefined" && typeof quasi === "function");
    };
    var _callQuasiFunction = function(foo, bar, data){
    	if(_isFunction(foo))
		{
			var args = Array.prototype.slice.call(arguments);
			args.splice(0,2);
			foo.apply(bar, args);
		}
    	else console.error("trying to invoke inconsistent function", foo);
    };
    function _escapeHTML(str) str.replace(/[&"<>]/g, function (m) escapeHTML.replacements[m]);
	_escapeHTML.replacements = { "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" };

	var uiRadio = {
		allowedM3Uoption: false,
		allowedXSPFoption: true,
		allowedLASTFMoption: true,
		
		isVisible: false,
		timer_Trackinfo: -1,
		trackMetaInformation: {
			artist: '',
			title: '',
			coverUrl: "images/logo-big.png",

			setTitle: function(artist, title){
				if(this.artist !== artist && this.title !== title){
					this.artist = artist;
					this.title = title;
					uiRadio.deferUpdateUi();

					if(uiRadio.allowedLASTFMoption)
					{
						LastFM.getCover(this.artist, this.title, function(status, data)
						{
							if(status === 200)
							{
								uiRadio.trackMetaInformation.setCoverUrl(data.url);
							}else{
								console.error("LastFM data loading error");

								uiRadio.trackMetaInformation.setDefaultCover();
								uiRadio.deferUpdateUi();
							}
						});
					}
				}
			},
			setCoverUrl: function(url){
				if(this.coverUrl !== url)
				{
					CoverImageLoader.getCoverImage(url, function(status, data){
						if(status === 200)
						{	
							uiRadio.trackMetaInformation.coverUrl = url;
						}
						else {
							uiRadio.trackMetaInformation.setDefaultCover();
						}
						uiRadio.deferUpdateUi();
					});
				}
			},
			setDefaultCover: function(){
				this.coverUrl = "http://userserve-ak.last.fm/serve/300x300/93524263.png";//images/logo-big.png";
			},
			setDefaultTitle: function(){
				this.title = 'stopped';
				this.artist = 'UltraFM';
			}
		},
		buttons: {
			play: null,
			stop: null,
			assignButtons: function(){
				this.play = document.getElementsByClassName("play")[0];
				this.stop = document.getElementsByClassName("stop")[0];
			},
			togglePlayButton: function(toggle){
				if(toggle)
				{
					this.play.classList.add('active');
				}else{
					this.play.classList.remove('active');
				}
			}
		},
		elements: {
			busyAnimation: null,
			volume_icon: null,
			volume_bar: null,
			artist: null,
			song: null,
			cover: null,
			assignElements: function(){
				this.busyAnimation = document.getElementById('connecting');
		        this.volume_bar  = document.querySelector('.volume input');
      			this.volume_icon = document.querySelector('.volume .icon');
	      		this.artist = document.getElementsByClassName("artist")[0];
				this.song   = document.getElementsByClassName("song")[0];
      			this.cover  = document.getElementsByClassName("half");
			},
			toggleBusyAnimation: function(show){
				this.busyAnimation.style.display = (show? 'block' : 'none');
			},
			setTitle: function(artist, title){
				this.artist.innerHTML = _escapeHTML(artist);
				this.song.innerHTML = _escapeHTML(title);
			},
			setCoverUrl: function(url){
				this.cover[0].style.backgroundImage = 'url("'+url+'")';
        		this.cover[1].style.backgroundImage = 'url("'+url+'")';
			},
			appearVolumeIcon: function(){
				var ivalue = Player.state.volumeLevel;
				this.volume_icon.innerHTML = _escapeHTML(String(ivalue > 60 ? 6 : (ivalue > 0 ? 5: 4)));
			}
		},
		isRadioBusy: function(){
			return Player.isWaiting() || 
			XSPF.loadingXSPF || LastFM.loadingCover|| CoverImageLoader.loadingCoverImage;
		},
		getCover: function (artist, album, onLoad){
			this.callback = onLoad;
		},
		initialise: function(){
			this.buttons.assignButtons();
			this.elements.assignElements();
			this.assignEvents();
			this.setVolume(70);
		},
		deferUpdateUi: function(){
			setTimeout(function(){uiRadio.updateUI();}, 0);
		},
		deferUpdateUiBusy: function(){
			setTimeout(function(){uiRadio.updateUIBusy();}, 0);
		},
		updateUI: function(){
			var s = Player.state;
			this.buttons.togglePlayButton(Player.isPlaying() || Player.isWaiting());
			this.elements.toggleBusyAnimation(uiRadio.isRadioBusy());
			if(!Player.isPlaying())
			{
				this.trackMetaInformation.setDefaultTitle();
				this.trackMetaInformation.setDefaultCover();
			}
			this.elements.setTitle(this.trackMetaInformation.artist, this.trackMetaInformation.title);
			this.elements.setCoverUrl(this.trackMetaInformation.coverUrl);

		},
		updateUIBusy: function(){
			this.elements.toggleBusyAnimation(uiRadio.isRadioBusy());
		},
		assignEvents: function(){
			this.elements.volume_bar.
				addEventListener("change", function(e) {
					var currentVolume = e.target.value;
					uiRadio.setVolume(currentVolume, true);
				});
			this.buttons.play. // PLAY
				addEventListener("click", function(e) {
					if(Player.isWaiting() || Player.isPlaying())
					{
						console.log("radio is busy")
						return;
					}
					Player.play();
				});
			this.buttons.stop. // STOP
				addEventListener("click", function(e) {
					if(Player.isPlaying() || Player.isWaiting())
						Player.stop();
				});

			Player.setStateChangeCallback(function(s){
				console.log("schange: ", s.stateString());
				uiRadio.checkPeriodicTrackInfoUpdate();
				if(!Player.isPlaying())
				{
					uiRadio.trackMetaInformation.setDefaultCover();
					uiRadio.trackMetaInformation.setDefaultTitle();
				}
				uiRadio.someStateChange();
		    });
		    M3U.setStateChangeCallback(this.busyStateChange);
		    XSPF.setStateChangeCallback(this.busyStateChange);
		    LastFM.setStateChangeCallback(this.busyStateChange);
		    CoverImageLoader.setStateChangeCallback(this.busyStateChange);
		},
		someStateChange: function(){
			uiRadio.deferUpdateUi();
			portMocking.requestBeep();
		},
		busyStateChange: function(){
			uiRadio.deferUpdateUiBusy();
			portMocking.requestBeep();
		},
		updateTrackInfo: function(){
			if(!this.isVisible)
				return;
			// initiate loading xspf
			if(this.allowedXSPFoption)
			{
				XSPF.getXSPFdata(function(status, data){
					if(status === 200)
					{
						uiRadio.trackMetaInformation.setTitle(data.artist, data.title);
						uiRadio.deferUpdateUi();
					}else{
						if(data.error)
							console.error("XSPF data loading error");
					}
				});
			}

		},
		checkPeriodicTrackInfoUpdate: function(){
			if(Player.isPlaying())
			{
				if(uiRadio.timer_Trackinfo !== -1)
					clearInterval(uiRadio.timer_Trackinfo);
				uiRadio.timer_Trackinfo = setInterval(function(){
					uiRadio.updateTrackInfo();
				}, 10000);
				setTimeout(function(){
					uiRadio.updateTrackInfo();
				}, 0);
			}else{
				clearInterval(uiRadio.timer_Trackinfo);
				uiRadio.timer_Trackinfo = -1;
			}
		},
		setVolume: function(level, frombar){
			if(!frombar)
				this.elements.volume_bar.value = level;
			Player.setVolume(level);
			this.elements.appearVolumeIcon();
		}
	};
	var portMocking = {
		useMocking: true,

		requestBeep: function(){
			if(this.useMocking)
			{

			}else{

			}
		},

		requestForLastFMSession: function(){

		},

		requestXSPF: function(){
			if(this.useMocking)
			{
				setTimeout(function(){
				portMocking.responseXSPF(200, [
'<?xml version="1.0" encoding="UTF-8"?>',
'<playlist xmlns="http://xspf.org/ns/0/" version="1">',
'  <title/>',
'  <creator/>',
'  <trackList>',
'    <track>',
'      <location>http://94.25.53.131:80/ultra-128.mp3</location>',
'      <title>KoRn - Never Never</title>',
'      <annotation>Stream Title: Radio ULTRA Online',
'Stream Description: Radio ULTRA Online',
'Content Type:audio/mpeg',
'Bitrate: 128',
'Current Listeners: 125',
'Peak Listeners: 578',
'Stream Genre: Rock</annotation>',
'      <info>http://www.radioultra.ru</info>',
'    </track>',
'  </trackList>',
'</playlist>'].join(''));}, 2000);

			}
		},
		responseXSPF: function(status, data){
			console.log("xspf port response", status);
			XSPF.portXSPF(status, data);
		},
		requestLastFMArtist: function(){
			if(this.useMocking)
			{
				setTimeout(function(){
					portMocking.responseLastFMArtist(200,
						{
						  "artist": {
						    "name": "Korn",
						    "image": [
						      {
						        "#text": "http:\/\/userserve-ak.last.fm\/serve\/34\/30098555.jpg",
						        "size": "small"
						      },
						      {
						        "#text": "http:\/\/userserve-ak.last.fm\/serve\/64\/30098555.jpg",
						        "size": "medium"
						      },
						      {
						        "#text": "http:\/\/userserve-ak.last.fm\/serve\/126\/30098555.jpg",
						        "size": "large"
						      },
						      {
						        "#text": "http:\/\/userserve-ak.last.fm\/serve\/252\/30098555.jpg",
						        "size": "extralarge"
						      },
						      {
						        "#text": "http:\/\/userserve-ak.last.fm\/serve\/_\/30098555\/Korn.jpg",
						        "size": "mega"
						      }
						    ]
						  }
						});
				}, 2000);
			}
		},
		responseLastFMArtist: function(status, data){
			console.log("LastFM Artist port response", status);
			LastFM.portArtist(status, data);
		},
		requestLastFMTrack: function(){
			if(this.useMocking)
			{
				setTimeout(function(){
					portMocking.responseLastFMTrack(200,
						{
						  "track": {
						    "id": "670868346",
						    "name": "Never Never",
						    "mbid": "961c9cbe-1eb6-4ecd-ac9f-bc1b4692b7c8",
						    "url": "http:\/\/www.last.fm\/music\/Korn\/_\/Never+Never",
						    "duration": "221000",
						    "streamable": {
						      "#text": "0",
						      "fulltrack": "0"
						    },
						    "listeners": "31200",
						    "playcount": "179541",
						    "artist": {
						      "name": "Korn",
						      "mbid": "ac865b2e-bba8-4f5a-8756-dd40d5e39f46",
						      "url": "http:\/\/www.last.fm\/music\/Korn"
						    },
						    "album": {
						      "artist": "Korn",
						      "title": "The Paradigm Shift",
						      "mbid": "52345713-a00e-4ee4-96b7-4b273982f415",
						      "url": "http:\/\/www.last.fm\/music\/Korn\/The+Paradigm+Shift",
						      "image": [
						        {
						          "#text": "http:\/\/userserve-ak.last.fm\/serve\/64s\/93524263.png",
						          "size": "small"
						        },
						        {
						          "#text": "http:\/\/userserve-ak.last.fm\/serve\/126\/93524263.png",
						          "size": "medium"
						        },
						        {
						          "#text": "http:\/\/userserve-ak.last.fm\/serve\/174s\/93524263.png",
						          "size": "large"
						        },
						        {
						          "#text": "http:\/\/userserve-ak.last.fm\/serve\/300x300\/93524263.png",
						          "size": "extralarge"
						        }
						      ],
						      "@attr": {
						        "position": "7"
						      }
						    }
						  }
						});
				}, 2000);
			}
		},
		responseLastFMTrack: function(status, data){
			console.log("LastFM Track port response", status);
			LastFM.portTrack(status, data);
		},

		portLastFMStatus: function(state){
			// uiRadio set status string
			// allow
		}
	};

	Player.initialise();
	uiRadio.initialise();
    uiRadio.isVisible = true;
  //   Player.setStateChangeCallback(function(s){
		// console.log("schange: ", s.stateString());
  //   });
    //http://94.25.53.131:80/ultra-128.mp3
    //http://94.25.53.131:80/ultra-56.aac
    Player.setSource("http://94.25.53.131:80/ultra-128.mp3");
    // Player.play();
// }());