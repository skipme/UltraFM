// (function(){

	var Player = {
		
		state: {
			volumeLevel: 0,
			streamSource: null,
			isMute: false,
			reconnectAttempts: -1,
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
				this.reconnectAttempts = 1;
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
				if(this.playingStream && this.reconnectAttempts > 0)
				{			
					var that = this;
					RequestTimers.setRequestTimeout("replay", function()
					{
						if(!that.playingStream && !that.waitingStream)
						{
							console.log('play attempt')
							Player.play();
							that.reconnectAttempts--;
						}else{
							console.log('skip attempt due loading already')
						}
					}, 5000);// 5 sec next attempt
				}

				this.playingStream = false; 
				this.waitingStream = false;
				this.errorStream = true;
				Player.stop();
				this.invokeStateChangeCallback();
			},
			stopped: function(){ 
				console.log('stopped')
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
			RequestTimers.stopTimeout("errorwaitsuspend");
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
		 a.addEventListener("playing", function() {Player.state.playing(); console.log("playing"); Player._suspending(false); } );
		 a.addEventListener("waiting", function() {Player.state.waiting(); console.log("waiting"); } );
		 a.addEventListener("error", function(e) { console.warn('error', JSON.stringify(e)); /*Player.stop();*/ Player.state.error(); } );

		 a.addEventListener("suspend", function(e) { console.warn('suspend', JSON.stringify(e)); Player.state.unwaiting(); Player._suspending(true); } );// ??????????? panel hiding => suspending?
		 a.addEventListener("ended", function() {Player.state.stopped(); } );
		 a.addEventListener("stalled", function() {Player.state.waiting(); console.warn('stalled'); } ); 
		 
		 a.addEventListener("abort", function() {  Player.state.stopped(); } ); 

		 a.addEventListener("loadstart", function() {Player.state.waiting(); console.log('loadstart');  } );
		 a.addEventListener("loadend", function() {Player.state.unwaiting();  console.log('loadend'); } );
		 a.addEventListener("canplay", function(e) {Player.state.unwaiting();  console.log('canplay'); } );
		 // a.addEventListener("progress", function(e) { console.log("progress", e); } );
		 a.addEventListener("loadedmetadata", function(e) { console.log("loadedmetadata", e); } );

	     // a.addEventListener("progress", function() { console.log('progress'); } ); 
		},
		_suspendingPrevTime: -1,
		_suspending : function(_susp)
		{
			/*if(_susp)
			{*/
				RequestTimers.setRequestTimeout("errorwaitsuspend", function()
				{
					if(Player.state.audioElement.currentTime !== 0 
						&& Player.state.audioElement.currentTime === Player._suspendingPrevTime)
					{
						console.warn('playing suspeding detected, error invokation...')
						Player.state.error();
					}else
					{
						Player._suspendingPrevTime = Player.state.audioElement.currentTime;
						setTimeout(function(){Player._suspending(true);}, 0);
					}
					
				}, 10000);
			/*}else
			{
				RequestTimers.stopTimeout("errorwaitsuspend");
			}*/
		}
	};
	var RequestTimers = { // prevent unique requests blocking ui/other updates
		timers: {},
		findTimer: function(timer)
		{
			var timerObj;
			if((timerObj = this.timers[timer]) !== undefined)
				return timerObj;
			else{
				timerObj = {timerTimeout: -1};
				this.timers[timer] = timerObj;
				return this.timers[timer];
			}
		},
		setRequestTimeout: function(timer, callback, _millisecs){
			var timerObj = this.findTimer(timer);
			if(timerObj.timerTimeout != -1)
			{
				clearTimeout(timerObj.timerTimeout);
				timerObj.timerTimeout = -1;
			}
			timerObj.timerTimeout = setTimeout(
				function(){
				 _callQuasiFunction(callback);
				}, 
			((typeof _millisecs) === 'number')? _millisecs : 1000 * 30); // 30sec

		},
		stopTimeout: function(timer){
			var timerObj = this.findTimer(timer);
			if(timerObj.timerTimeout !== -1)
			{
				clearTimeout(timerObj.timerTimeout);
				timerObj.timerTimeout = -1;
			}
		}
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
			_callQuasiFunction(this.onStateChange, null);
			this.loadingCallback = onLoad;
			this.trackRequest = {artist: artist, track: track}; 
			portMocking.requestLastFMTrack(artist, track);			

			var self = this;
			RequestTimers.setRequestTimeout("lastfmCover", function(){
				self.loadingCover = false;
				console.log("lastfm loadingCover timed out")
				_callQuasiFunction(self.onStateChange, null);
			});
		},
		portTrack: function(status, data){
			if(status === 200)
			{
				this.loadingCover = false;
				RequestTimers.stopTimeout("lastfmCover");

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
			RequestTimers.stopTimeout("lastfmCover");

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

			var self = this;
			RequestTimers.setRequestTimeout("lastfmScrobble", function(){
				self.loadingCover = false;
				console.log("lastfm scrobble timed out")
				_callQuasiFunction(self.onStateChange, null);
			});
		},
		portScrobble: function(){
			this.requestScrobble = false;
			RequestTimers.stopTimeout("lastfmScrobble");

			_callQuasiFunction(this.onStateChange, null);
		}
	};

	var XSPF = {
		loadingCallback: null,
		loadingXSPF: false,
		onStateChange: null,
		xspfUrl: null,

		setStateChangeCallback: function(onChange){
			this.onStateChange = onChange;
		},
		getXSPFdata: function(onLoad){
			if(this.xspfUrl === null || typeof this.xspfUrl === "undefined" || this.xspfUrl == "")
			{
				_callQuasiFunction(onLoad, null, -1, {emptyurl: 1});
				return;
			}
			if(this.loadingXSPF)
			{
				_callQuasiFunction(onLoad, null, -1, {waiting: 1});
				return;
			}
			this.loadingXSPF = true;
			_callQuasiFunction(this.onStateChange, null);

			this.loadingCallback = onLoad;
			portMocking.requestXSPF(this.xspfUrl);

			var self = this;
			RequestTimers.setRequestTimeout("xspf", function(){
				self.loadingXSPF = false;
				console.log("xspf timed out")
				_callQuasiFunction(self.onStateChange, null);
			});
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
			RequestTimers.stopTimeout("xspf");
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

		getM3Udata: function(tag, onLoad){
			if(this.loadingM3U)
			{
				_callQuasiFunction(onLoad, null, -1, {error: 1});
				return;
			}
			this.loadingM3U = true;
			_callQuasiFunction(this.onStateChange, null);

			this.loadingCallback = onLoad;
			portMocking.requestM3U(tag);

			var self = this;
			RequestTimers.setRequestTimeout("m3u", function(){
				self.loadingM3U = false;
				console.log("m3u timed out")
				_callQuasiFunction(self.onStateChange, null);
			});
		},
		portM3U: function(status, data){
			this.loadingM3U = false;
			RequestTimers.stopTimeout("m3u");
			_callQuasiFunction(this.onStateChange, null);

			var tag = data.tag;
			data = (status === 200? this.parseM3Udata(data.m3u, data.isShoutcastServer): {error: 1});
			data.tag = tag;
			_callQuasiFunction(this.loadingCallback, null, status, data);
		},
		parseM3Udata: function(xmlstring, shoutcastServer){
			var m3ulines = xmlstring.split("\n");
			var mp3 = null;
			for (var i = 0; i < m3ulines.length; i++) {
				if(m3ulines[i][0] === "#")
					continue;
				else{
					mp3 = m3ulines[i];
					break;
				}
			};
			
			if(mp3 === null)
				return null;

			var mp3e = null;
			if((mp3e = mp3.indexOf(".mp3")) > 0)
			{
				var xspf = mp3.substring(0,mp3e +4) +".xspf";
				return {mp3: mp3, xspf: xspf};
			}
			else if(shoutcastServer){
				var liof = mp3.lastIndexOf("/");
				var icecast7 = mp3.substring(0,liof) +"/7.html";
				return {mp3: mp3 +";", xspf: null, icecast7: icecast7};
			}
			return null;
		}
	};

	var _parseXml = function(xmlStr) {
        return ( new window.DOMParser() ).parseFromString(xmlStr, "application/xml");// ! printing to console if xml contains syntax errors (uncorrect ...) with page src uri
    };
    var _isFunction = function(quasi){
    	return (typeof quasi !== "undefined" && typeof quasi === "function");
    };
    var _callQuasiFunction = function(foo, bar, data){
    	if(_isFunction(foo))
		{
			var args = Array.prototype.slice.call(arguments);
			args.splice(0,2);
			try {
				foo.apply(bar, args);
			}catch(_exceptfoo)
			{
				console.error("error while invoke function", foo, _exceptfoo);
			}
		}
    	else console.error("trying to invoke inconsistent function", foo);
    };

    function _escapeHTML(str) { return str.replace(/[&"<>]/g, function (m) { return _escapeHTML.replacements[m];}); };
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
			metaFilled: false,
			scrobbled: false,

			filtrateString: function(str){
				var result = "";
				for (var i = 0; i < str.length; i++) {
					
					var chkd = str.charCodeAt(i);
					var chra = str.charAt(i);

					if((chkd >= "a".charCodeAt(0) &&
					   chkd <= "z".charCodeAt(0))
						||
						(chkd >= "A".charCodeAt(0) &&
					   chkd <= "Z".charCodeAt(0))
						||
						(chkd >= "А".charCodeAt(0) &&
					   chkd <= "Я".charCodeAt(0))
						||
						(chkd >= "а".charCodeAt(0) &&
					   chkd <= "я".charCodeAt(0))
						||
						(chkd >= "0".charCodeAt(0) &&
					   chkd <= "9".charCodeAt(0))
						|| chra === "&"
						|| chra === "?" || chra === "!" || chra === "."						
						|| chra === " "
						|| chra === "'" || chra === '"'
						|| chra === "(" || chra === ")"
						)
					{
						result += chra;
					}else
					if(chra === "-" && result.length > 0)
						result += "-";
					else
					if( chra === "_")
						result += " ";
				};

				return result;
			},
			setTitle: function(artist, title){
				if(this.artist !== artist && this.title !== title){
					
					this.artist = this.filtrateString(artist);
					this.title = this.filtrateString(title);
					this.scrobbled = false;
					this.metaFilled = true;
					uiRadio.deferUpdateUi();

					if(uiRadio.allowedLASTFMoption && this.artist !== 'UltraFM')
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
				if(!this.scrobbled && uiRadio.allowedLASTFMoption &&
					this.metaFilled)
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
				this.coverUrl = "images/logo-big.png";
			},
			setDefaultTitle: function(){
				this.title = 'stopped';
				this.artist = 'UltraFM';
				this.metaFilled = false;
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
			lastfmsessLinkdo: null,
			lastfmsessLinkok: null,
			lastfmtimecon: null,
			lastfmUser: null,
			lfenabled: null,
			firet: null,
			bookmark: null,
			panel_player: null,
			panel_opts: null,
			options_active: false,
			avk: null,
			alastfm: null,
			agith: null,
			opt_savesess: null,
			tagsContainer: null,

			assignElements: function(){
				this.busyAnimation = document.getElementById('connecting');
		        this.volume_bar  = document.querySelector('.volume input');
      			this.volume_icon = document.querySelector('.volume .icon');
	      		this.artist = document.querySelector(".artist");
				this.song   = document.querySelector(".song");
      			this.cover  = document.getElementsByClassName("half");
      			this.lastfmsessLinkdo = document.getElementById('createLastFMSession_do');
      			this.lastfmsessLinkok = document.getElementById('createLastFMSession_ok');
      			this.lastfmsessLinkOff = document.getElementById('closeLastFMSession');
      			this.lastfmtimecon = document.getElementById('timecon');
      			this.lfenabled = document.getElementById('lfenabled');
      			this.lastfmUser = document.getElementById('lastfm-user');
      			this.firet = document.getElementById('tanim');
      			this.bookmark = document.getElementById('bookmark-la');
      			this.panel_player = document.getElementById('ff-player'); 
      			this.panel_opts = document.getElementById('ff-opts'); 
      			this.avk = document.querySelector('.icon.vk');
      			this.alastfm = document.querySelector('.icon.lastfm');
      			this.agith = document.querySelector('.icon.github');
      			this.opt_savesess = document.getElementById('opt_savesess');
      			this.tagsContainer = document.getElementById('tagsContainer');

      			this.assignEvents();
			},
			toggleBusyAnimation: function(show){
				this.busyAnimation.style.display = (show? 'block' : 'none');
			},
			setTitle: function(artist, title){
				this.artist.textContent = _escapeHTML(artist);
				this.song.textContent = _escapeHTML(title);
				this.avk.href = 'http://vk.com/audio?q=' +_escapeHTML(artist) +' - '+ _escapeHTML(title);
				this.alastfm.href = 'http://last.fm/music/'+_escapeHTML(artist)+'/_/'+_escapeHTML(title);
			},
			setCoverUrl: function(url){
				this.cover[0].style.backgroundImage = 'url("'+url+'")';
        		this.cover[1].style.backgroundImage = 'url("'+url+'")';
			},
			appearVolumeIcon: function(){
				var ivalue = Player.state.volumeLevel;
				this.volume_icon.textContent = String(ivalue > 80?7:(ivalue > 40 ? 6 : (ivalue > 0 ? 5: 4)));
			},
			updateScrobbleInfo: function(enabled, username, at)
			{
				var d = at;
				if(enabled)
				{
					this.lastfmsessLinkdo.style.display = "none";
					this.lastfmsessLinkok.style.display = "block";
					this.lastfmtimecon.style.display = "block";
					this.lastfmtimecon.textContent = d.toLocaleString();
				}else{
					this.lastfmsessLinkdo.style.display = "block";
					this.lastfmsessLinkok.style.display = "none";
					this.lastfmtimecon.style.display = "none";
				}
				// this.lastfmsessLink.textContent = _escapeHTML(enabled?("соединено "+ d.toLocaleString()) : _("opt_lfm_connectcmd.do"));
				this.lastfmUser.textContent = _escapeHTML(username?username:"");
				this.lastfmsessLinkOff.style.display = enabled? "block":"none" ;
				this.lfenabled.style.display = enabled? "":"none" ;
			},
			showFire: function(show)
			{
				this.firet.style.display = show? "block":"none" ;
			},
			showOptions: function(overrideShow)
			{
				var show = this.options_active = !this.options_active;
				if(typeof overrideShow !== "undefined")
					show = overrideShow;
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
			},
			setOptions: function(options)
			{
				this.opt_savesess.checked = options.saveLFMSess;	
			},
			assignEvents: function()
			{
				this.opt_savesess. // 
				addEventListener("click", function(e) {
					console.log("checker", e.target.checked)
					uiRadio.options_state.saveLFMSess	= e.target.checked;
					uiRadio.optionsUiChange();			
				});
			},
			removeTags: function()
			{
				while (tagsContainer.firstChild) 
				{
				    tagsContainer.removeChild(tagsContainer.firstChild);
				}
			},
			applyTags: function(array_tags)
			{
				for (var i = 0; i < array_tags.length; i++) 
				{
					var lab = document.createElement("label");
					lab.textContent = array_tags[i];
					lab.id="opt_brate_l_"+array_tags[i];
					var input = document.createElement("input");
					input.name = "brate";
					input.type="radio"; 
					input.id="opt_brate_"+array_tags[i];
					input.value = array_tags[i];
					if(uiRadio.options_state && uiRadio.options_state.tag_selected === array_tags[i])
						input.checked = "checked";
					input.addEventListener("change", function(e) {
						
						uiRadio.options_state.tag_selected	= e.target.value;
						uiRadio.optionsUiChange();			
					});

					lab.appendChild(input);
					tagsContainer.appendChild(lab);
					tagsContainer.appendChild(document.createElement("br"));
				}
			}//,
		},
		options_state: {},
		optionsUiChange: function(){
			var optex = {saveLFMSess: (this.options_state.saveLFMSess || false), tag_selected: this.options_state.tag_selected, volume_level:  this.options_state.volume_level}
			portMocking.requestOptions(optex);
			console.log("ui opts change", optex)
		},
		isRadioBusy: function(){
			return Player.isWaiting() || 
			XSPF.loadingXSPF || LastFM.loadingCover|| CoverImageLoader.loadingCoverImage ||
			LastFM.requestScrobble || M3U.loadingM3U;
		},
		getCover: function (artist, album, onLoad){
			this.callback = onLoad;
		},
		initialise: function(){
			this.buttons.assignButtons();
			this.elements.assignElements();
			this.assignEvents();
			// this.setVolume(70, false);
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
			for (var i = 0; i < this.options_state.tags.length; i++) 
			{
				var _thisselected =( this.options_state.tag_playing !== undefined)
				 && (this.options_state.tags[i] === this.options_state.tag_playing);
				var lab = document.getElementById("opt_brate_l_"+this.options_state.tags[i])
				lab.firstChild.textContent = (_thisselected?"[+] ":"[-] ") + this.options_state.tags[i];
			}
			
		},
		assignEvents: function(){
			this.elements.volume_bar. // VOLUME CHANGED
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
					if(uiRadio.options_state.tag_selected === undefined)
					{
						console.log("select tag first")
						return;
					}
					M3U.getM3Udata(uiRadio.options_state.tag_selected, function(code, data){
						if(code !== 200 || data === null || data.error)
						{
							console.log("nothing to play...");
						}else{
							Player.setSource(data.mp3);
							XSPF.xspfUrl = data.xspf;
							Player.play();	
							uiRadio.options_state.tag_playing = data.tag;
						}
					})
					
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
		    this.elements.lastfmsessLinkdo. // connect to LastFM
				addEventListener("click", function(e) {
					portMocking.requestForLastFMSession();
			});
			this.elements.lastfmsessLinkOff. // disconnect to LastFM
				addEventListener("click", function(e) {
					portMocking.closeLastFMSession();
			});
				
			this.elements.bookmark. // show/hide options
				addEventListener("click", function(e) {
					uiRadio.elements.showOptions();
			});
			this.elements.alastfm. // 
				addEventListener("click", function(e) {
					e.preventDefault();
					portMocking.requestTab(e.target.href);
					
			});
			this.elements.avk. // 
				addEventListener("click", function(e) {
					e.preventDefault();
					portMocking.requestTab(e.target.href);
			});
			this.elements.agith. // 
				addEventListener("click", function(e) {
					e.preventDefault();
					portMocking.requestTab(e.target.href);					
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
			{	
				this.elements.volume_bar.value = level;
				// return;
			}
			Player.setVolume(level);

			this.elements.appearVolumeIcon();
			this.options_state.volume_level = level;
			if(frombar)
				this.optionsUiChange();
		},
		scrobble: function(enable, name, at){
			if( !this.allowedLASTFMSCROBBLEoption && enable )
			{
				this.allowedLASTFMSCROBBLEoption = enable;
				// scrobble current composition
				this.trackMetaInformation.scrobbleCurrentComposition();
			}
			
			this.elements.updateScrobbleInfo(enable, name, at);
			LastFM.state.username = name;

			this.elements.showOptions(false);// hide options panel

			console.log("lastfm options: ", enable?"scrobble":"", enable?("as " +name):"");
		},
		options: function(opts){
			if(opts === null || opts === undefined)
				return;

			var shallowTags = this.options_state.tags;
			this.options_state = opts;
			this.options_state.tags = shallowTags;
			this.elements.setOptions(opts);
			this.setVolume(opts.volume_level || 44, false);
			if(shallowTags)
			{
				this.elements.removeTags();
				this.elements.applyTags(shallowTags);
				this.deferUpdateUiBusy();
			}
		},
		optionTags: function(tags)
		{
			this.options_state.tags = tags;	
			if(this.options_state.tag_selected === undefined)
				this.options_state.tag_selected = tags[0];

			this.options(this.options_state);
		}
	};
	var portMocking = {
		useMocking: true,
		requestOptions: function(opts){
			if(this.useMocking)
			{
				this.responseOptions({ saveLFMSess: false, tag_selected: "128", volume_level: 44 })
			}else{
				self.port.emit('options', opts);
			}
		},
		responseOptions: function(opts){
			uiRadio.options(opts);
		},
		requestTab: function(url){
			if(this.useMocking)
			{
				// window.open(url);
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
		closeLastFMSession: function(){
			if(this.useMocking)
				return;
			else
				self.port.emit('closeLastFMSession', {});
		},
		requestM3U: function(tag){
			console.log("request m3u with tag ", tag);
			if(this.useMocking)
			{
				setTimeout(function(){
					portMocking.responseM3U(200, {m3u: "http://nashe1.hostingradio.ru:80/ultra-192.mp3", tag: tag});
					// portMocking.responseM3U(200, {m3u: "http://94.25.53.132:80/ultra-128.mp3"});
					// portMocking.responseM3U(200, {m3u: ["#", "http://193.35.52.62:8113/"].join("\n"), isShoutcastServer: true});
				}, 2000);
			}else{
				self.port.emit('takem3u', {tag: tag});
			}
		},
		responseM3U: function(status, data){
			console.log("m3u port response", status);
			M3U.portM3U(status, data);
		},
		requestXSPF: function(url){
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

//'      <location>http://94.25.53.131:80/ultraNEW-320.mp3.m3u</location>',
'      <location>http://94.25.53.131:80/ultra-128.mp3</location>',

'      <title>10 Years - Actions & Motives</title>',
'      <annotation>Stream Title: Radio ULTRA Online',
'Stream Description: Radio ULTRA Online',
'Stream Genre: Rock</annotation>',
'      <info>http://www.radioultra.ru</info>',
'    </track>',
'  </trackList>',
'</playlist>'].join('\n'));}, 4000);

			}else{
				self.port.emit('loadXSPF', {url: url});
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
			console.log("the state is",state.at, new Date(state.at).toLocaleFormat());
			uiRadio.scrobble(state.isAuthorised, state.name, new Date(state.at));
			
		},
		takeTags: function()
		{
			if(this.useMocking)
			{
				setTimeout(function(){
					portMocking.responseTags(200, { tags: "96,128,HQ" })
				},1000);
			}else
			{
				self.port.emit('taketags', { });
			}

		},
		responseTags: function(status, data)
		{
			if(status === 200)
			{
				console.log("got tags: ", data.tags);
				var tags = data.tags.split(',');
				uiRadio.optionTags(tags);
			}
			else
			{
				console.log("tags not optioned: ", data.tags);
				uiRadio.optionTags([]);
			}
		}
	};

	portMocking.useMocking = 
		false;
		//true;
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
		self.port.on("here_m3u", function(obj){
			portMocking.responseM3U(obj.code, obj.data);
		});
		self.port.on("lastfm_trackinfo", function(obj){
			portMocking.responseLastFMTrack(obj.code, obj.data);
		});
		self.port.on("lastfm_artistinfo", function(obj){
			portMocking.responseLastFMArtist(obj.code, obj.data);
		});
		self.port.on("options", function(obj){
			portMocking.responseOptions(obj);
		});
		self.port.on("here_tags_darling", function(obj){
			portMocking.responseTags(obj.code, obj.data);
		});
	}

	Player.initialise();
	uiRadio.initialise();
    uiRadio.isVisible = true;

    uiRadio.deferUpdateUi();

    portMocking.portLastFMStatus({isAuthorised: false, name: "unauthorised", at: new Date()});
    portMocking.takeTags();
// }());
