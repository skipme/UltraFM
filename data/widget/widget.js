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
			unwaiting: function(){ 
				this.waitingStream = false;
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

		 a.addEventListener("suspend", function(e) { console.log(e); Player.state.unwaiting(); } );// ??????????? panel hiding => suspending?
		 a.addEventListener("ended", function() {Player.state.stopped(); } );
		 a.addEventListener("stalled", function() {Player.state.waiting(); } ); 
		 
		 a.addEventListener("abort", function() {Player.state.stopped(); } ); 

		 a.addEventListener("loadstart", function() {Player.state.waiting(); } );
		 a.addEventListener("loadend", function() {Player.state.unwaiting(); } );
		 a.addEventListener("canplay", function(e) {Player.state.unwaiting(); } );
		 // a.addEventListener("progress", function(e) { console.log("progress", e); } );
		},

	};
	var CoverImageLoader = {
		loadingCallback: null,
		loadingCoverImage: false,
		img: null,

		timeoutId: -1,

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
		    if(this.timeoutId !== -1)
		    {	
		    	clearTimeout(this.timeoutId);
		    	this.timeoutId = -1;
		    }
		    this.timeoutId = setTimeout(function() {
		    	if(CoverImageLoader.loadingCoverImage)
		    	{	
		    		CoverImageLoader.loadingCoverImage = false;
		    		_callQuasiFunction(CoverImageLoader.onStateChange, null);
		    		_callQuasiFunction(onLoad, null, -1, {url: url});
		        	console.log("image url timed out", url);
		    	}
		    	CoverImageLoader.timeoutId = -1;
		    }, 10000);
		    this.img.src = url;
		}
	};
	var LastFM = {
		state: {username: null},

		loadingCallback: null,
		loadingCover: false,
		requestScrobble: false,

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

				if( typeof data.track !== "undefined" && 
					typeof data.track.album !== "undefined" && 
					typeof data.track.album.image !== "undefined" )
				{
					data = (status === 200? {url: this.retrieveCover(data.track.album.image, 3)}: {error: 1});
					_callQuasiFunction(this.loadingCallback, null, status, data);
				}else{
					portMocking.requestLastFMArtist(this.trackRequest.artist);
				}
			}
			else{
				portMocking.requestLastFMArtist(this.trackRequest.artist);
			}
		},
		portArtist: function(status, data){
			this.loadingCover = false;
			_callQuasiFunction(this.onStateChange, null);

			if( typeof data.artist !== "undefined" && 
				typeof data.artist.image !== "undefined" )
			{
				data = (status === 200? {url: this.retrieveCover(data.artist.image, 3)}: {error: 1});
			}else data = {error: -1};
			// make sure we informed radio in order to cover update 
			_callQuasiFunction(this.loadingCallback, null, status, data);
		},
		retrieveCover: function (arrayCovers, predefIndex)
		{
		  if(arrayCovers.length <= predefIndex)
		    predefIndex = arrayCovers.length -1;
		  if(predefIndex < 0)
		    return arrayCovers.length === 0 ? null : arrayCovers[0]["#text"];
		  return arrayCovers[predefIndex]["#text"];
		},
		scrobble: function(artist, track)
		{
			this.requestScrobble = true;
			_callQuasiFunction(this.onStateChange, null);
			portMocking.requestLastFMScrobble(artist, track);
		},
		portScrobble: function(){
			this.requestScrobble = false;
			_callQuasiFunction(this.onStateChange, null);
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
			_callQuasiFunction(this.onStateChange, null);

			this.loadingCallback = onLoad;
			portMocking.requestXSPF();
		},
		parseXSPFdata: function(xmlstring){
			var xspf = _parseXml(xmlstring);
			var track_e = xspf.querySelector('track > title');

			if(track_e === null || typeof track_e === "undefined")
				return this.secondTryParseXSPFdata(xmlstring);
			try {
				var track = track_e.textContent;
				var artistAndTitle = track.split(" - ");

				return {artist: artistAndTitle[0], title: artistAndTitle[1]};
			}catch(e){
				console.warn("can't parse xspf data");
			}
			return null;
		},
		secondTryParseXSPFdata: function(xmlstring)
		{
			var iofleft = xmlstring.indexOf("<title>");
			var iofright = xmlstring.indexOf("</title>");
			if(iofright > 0 && iofleft >= 0)
			{
				try{
				var tracks = xmlstring.substring(iofleft +7, iofright);
				var artistAndTitle = tracks.split(" - ");
				return {artist: artistAndTitle[0], title: artistAndTitle[1]};
				}catch(e){
					return null;
				}
			}else
			 return null;
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
    function _escapeHTML(str) str.replace(/[&"<>]/g, function (m) _escapeHTML.replacements[m]);
	_escapeHTML.replacements = { "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" };

	var uiRadio = {
		allowedM3Uoption: false,
		allowedXSPFoption: true,
		allowedLASTFMoption: true,
		allowedLASTFMSCROBBLEoption: false,

		isVisible: false,
		timer_Trackinfo: -1,
		trackMetaInformation: {
			artist: '',
			title: '',
			coverUrl: "images/logo-big.png",
			scrobbled: false,

			setTitle: function(artist, title){
				if(this.artist !== artist && this.title !== title){
					
					this.artist = artist;
					this.title = title;
					this.scrobbled = false;
					uiRadio.deferUpdateUi();

					if(uiRadio.allowedLASTFMoption)
					{
						this.scrobbleCurrentComposition();
						LastFM.getCover(this.artist, this.title, function(status, data)
						{
							if(status === 200)
							{
								uiRadio.trackMetaInformation.setCoverUrl(data.url);
							}else{
								console.error("LastFM track/artist loading error");

								uiRadio.trackMetaInformation.setDefaultCover();
								uiRadio.deferUpdateUi();
							}
						});
					}
				}
			},
			scrobbleCurrentComposition: function(){
				if(!this.scrobbled)
				{
					if(uiRadio.allowedLASTFMSCROBBLEoption)
					{
						LastFM.scrobble(this.artist, this.title);
					}
					this.scrobbled = true;
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
				this.coverUrl = 
				// "http://userserve-ak.last.fm/serve/300x300/93524263.png";
				"images/logo-big.png";
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
			lastfmsessLink: null,
			lastfmUser: null,
			firet: null,
			bookmark: null,
			panel_player: null,
			panel_opts: null,
			options_active: false,
			avk: null,
			alastfm: null,
			agith: null,

			assignElements: function(){
				this.busyAnimation = document.getElementById('connecting');
		        this.volume_bar  = document.querySelector('.volume input');
      			this.volume_icon = document.querySelector('.volume .icon');
	      		this.artist = document.querySelector(".artist");
				this.song   = document.querySelector(".song");
      			this.cover  = document.getElementsByClassName("half");
      			this.lastfmsessLink = document.getElementById('createLastFMSession');
      			this.lastfmUser = document.getElementById('lastfm-user');
      			this.firet = document.getElementById('tanim');
      			this.bookmark = document.getElementById('bookmark-la');
      			this.panel_player = document.getElementById('ff-player'); 
      			this.panel_opts = document.getElementById('ff-opts'); 
      			this.avk = document.querySelector('.icon.vk');
      			this.alastfm = document.querySelector('.icon.lastfm');
      			this.agith = document.querySelector('.icon.github');
			},
			toggleBusyAnimation: function(show){
				this.busyAnimation.style.display = (show? 'block' : 'none');
			},
			setTitle: function(artist, title){
				this.artist.textContent = artist;
				this.song.textContent = title;
				this.avk.href = 'http://vk.com/audio?q='+_escapeHTML(title);
				this.alastfm.href = 'http://last.fm/music/'+_escapeHTML(artist)+'/_/'+_escapeHTML(title);
			},
			setCoverUrl: function(url){
				this.cover[0].style.backgroundImage = 'url("'+url+'")';
        		this.cover[1].style.backgroundImage = 'url("'+url+'")';
			},
			appearVolumeIcon: function(){
				var ivalue = Player.state.volumeLevel;
				this.volume_icon.textContent = _escapeHTML(String(ivalue > 80?7:(ivalue > 40 ? 6 : (ivalue > 0 ? 5: 4))));
			},
			updateScrobbleInfo: function(enabled, username)
			{
				var d = new Date();
				var curr_hour = d.getHours();
				var curr_min = d.getMinutes();

				this.lastfmsessLink.textContent = _escapeHTML(enabled?("соединено в "+curr_hour + " : " + curr_min) : "авторизоваться с LastFM");
				this.lastfmUser.textContent = _escapeHTML(username?username:"");
			},
			showFire: function(show)
			{
				this.firet.style.display = show? "block":"none" ;
			},
			showOptions: function()
			{
				var show = this.options_active = !this.options_active;

				if(show)
				{
					this.panel_player.classList.remove('panel-active');
					this.panel_opts.classList.remove('panel-hidden');
					this.panel_player.classList.add('panel-hidden');
					this.panel_opts.classList.add('panel-active');
				}else{
					this.panel_opts.classList.remove('panel-active');
					this.panel_player.classList.remove('panel-hidden');
					this.panel_opts.classList.add('panel-hidden');
					this.panel_player.classList.add('panel-active');
				}
			}
		},
		isRadioBusy: function(){
			return Player.isWaiting() || 
			XSPF.loadingXSPF || LastFM.loadingCover|| CoverImageLoader.loadingCoverImage ||
			LastFM.requestScrobble;
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
			this.buttons.togglePlayButton(Player.isPlaying());
			this.elements.toggleBusyAnimation(uiRadio.isRadioBusy());
			if(!Player.isPlaying())
			{
				this.trackMetaInformation.setDefaultTitle();
				this.trackMetaInformation.setDefaultCover();
			}
			this.elements.showFire(Player.isPlaying());
			this.elements.setTitle(this.trackMetaInformation.artist, this.trackMetaInformation.title);
			this.elements.setCoverUrl(this.trackMetaInformation.coverUrl);

			console.log("full ui update");
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
		    this.elements.lastfmsessLink. // connect to LastFM
				addEventListener("click", function(e) {
					portMocking.requestForLastFMSession();
			});
			this.elements.bookmark. // options
				addEventListener("click", function(e) {
					uiRadio.elements.showOptions();
			});
			this.elements.alastfm. // 
				addEventListener("click", function(e) {
					portMocking.requestTab(e.target.href);
					e.preventDefault();
			});
			this.elements.avk. // 
				addEventListener("click", function(e) {
					portMocking.requestTab(e.target.href);
					e.preventDefault();
			});
			this.elements.agith. // 
				addEventListener("click", function(e) {
					portMocking.requestTab(e.target.href);
					e.preventDefault();
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
						if(data === null || data.error)
						{
							uiRadio.trackMetaInformation.setDefaultTitle();
							uiRadio.trackMetaInformation.setDefaultCover();
						}
						else
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
		},
		scrobble: function(enable, name){
			if( !this.allowedLASTFMSCROBBLEoption && enable)
			{
				// scrobble current composition

			}
			this.allowedLASTFMSCROBBLEoption = enable;
			this.elements.updateScrobbleInfo(enable, name);
			LastFM.state.username = name;
			console.log("lastfm options: ", enable?"scrobble":"", enable?("as " +name):"");
		}
	};
	var portMocking = {
		useMocking: true,

		requestTab: function(url){
			if(this.useMocking)
			{
				
			}else{
				self.port.emit('open_tab', {url: url});
			}
		},
		requestLastFMScrobble: function(artist, track) {
			if(this.useMocking)
			{
				setTimeout(function(){portMocking.responseLastFMScrobble(200);}, 2000);
			}else{
				self.port.emit('lastfm_scrobble', {track: track, artist: artist});
			}
		},
		responseLastFMScrobble: function(status) {
			if(status===200)
				console.log("scrobbled for: ", LastFM.state.username);
			else console.warn("scrobbling error");
			LastFM.portScrobble();
		},
		requestBeep: function(){
			if(this.useMocking)
			{
				// console.log("beep");
			}else{
				self.port.emit('beep', {});
			}
		},

		requestForLastFMSession: function(){
			if(this.useMocking)
				return;
			else
				self.port.emit('createLastFMSession', {});
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
'      <title>10 Years - Actions & Motives</title>',
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

			}else{
				self.port.emit('loadXSPF', {});
			}
		},
		responseXSPF: function(status, data){
			console.log("xspf port response", status);
			XSPF.portXSPF(status, data);
		},
		requestLastFMArtist: function(artist){
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
			}else{
				self.port.emit('lastfm_artistinfo', {artist: artist});
			}
		},
		responseLastFMArtist: function(status, data){
			console.log("LastFM Artist port response", status);
			LastFM.portArtist(status, data);
		},
		requestLastFMTrack: function(artist, track){
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
			}else{
				self.port.emit('lastfm_trackinfo', {artist: artist, track: track});
			}
		},
		responseLastFMTrack: function(status, data){
			console.log("LastFM Track port response", status);
			LastFM.portTrack(status, data);
		},

		portLastFMStatus: function(state){
			uiRadio.scrobble(state.isAuthorised, state.name);
			
		},
	};

	portMocking.useMocking = false;
	if(!portMocking.useMocking)
	{
		self.port.on("LastFMStatus", function(obj){

			portMocking.portLastFMStatus(obj);
		});
		self.port.on("lastfm_scrobble", function(obj){
			portMocking.responseLastFMScrobble(obj.code, obj.data);
		});
		self.port.on("here_xspf", function(obj){
			portMocking.responseXSPF(obj.code, obj.data);
		});
		self.port.on("lastfm_trackinfo", function(obj){
			portMocking.responseLastFMTrack(obj.code, obj.data);
		});
		self.port.on("lastfm_artistinfo", function(obj){
			portMocking.responseLastFMArtist(obj.code, obj.data);
		});
	}

	Player.initialise();
	uiRadio.initialise();
    uiRadio.isVisible = true;

    Player.setSource("http://94.25.53.133:80/ultra-128.mp3");

    portMocking.portLastFMStatus({isAuthorised: false, name: "unauthorised"});

// }());
