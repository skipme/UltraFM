(function(){
	const self = require("sdk/self");
  const widgets = require('sdk/widget');
  const panel = require('sdk/panel');
	const Request = require("sdk/request").Request;

  const lfo = require('lastfm').lastfm;
  
  const lastfm = new lfo({apiKey: "645f34cc469fc92baa8d2ab23214a36b", apiSecret: "9c6c9875d868c79365dbe9d365ba6f8d"});
  const raioUrls = 
  { m3u: "http://mp3.radioultra.ru/ultra-128.mp3.m3u", 
    mp3: null,
    xspf: null

  };

  const tabs = require('sdk/tabs');
  const notifications = require("sdk/notifications");

  var barWidgetBtn = null;
  var widgetPanel = null;
  
  var lastfm_state = {userName: null, key: null, isSubscriber: false,
    pushData: function(lastfmResponse){
      console.log(lastfmResponse)
      this.userName = lastfmResponse.name;
      this.key = lastfmResponse.key;
      this.isSubscriber = lastfmResponse.subscriber == 1;
    }};

	function init () {
    tabs.on('ready', function (tokentab) {
      console.log(tokentab.url)
      if(tokentab.url.contains("lastfm.ru/home?UFM=UltraFMFF"))
      {
        var token = getTokenFromUrl(tokentab.url);
        if(token === null)
          return;
        console.log("url token found!");
        // 
        lastfm.auth.getSession({token: token}, {
          success: function (responseCode, responseJson) {
            // name, key, subscriber
            if(responseCode !== 200 || typeof responseJson.session === "undefined")
            {
              console.warn("can't create session for lastfm",responseJson);
              return;
            }
            lastfm_state.pushData(responseJson.session);

            widgetPanel.port.emit("LastFMStatus", {isAuthorised: true, name: lastfm_state.userName});
            console.log("session ok: ", responseCode);
            
            notifications.notify({
              title: "UltraFM",
              text: "LastFM now scrobbling for: " +lastfm_state.userName ,
              iconURL: self.data.url("icon_128.png")
            });

          },
          error: function (responseCode, responseText){
             console.warn("can't create session for lastfm", responseText);
          }
        });
          tokentab.url = "http://www.lastfm.ru/home";
      }

    });
		preparePanel();
		prepareWidget();
	}
  function getTokenFromUrl(query){
    if(query.contains("?"))
    {  
      var qiof = query.indexOf("?");
         query = query.substring(qiof +1,  query.length);
    }

    var vars = query.split("&");
    if(vars.length > 0)
    {
      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if(pair.length !== 2)
          continue;
        if(pair[0] === "token")
          return pair[1];
      };
      return null;
    }else
    {
      return null;
    }
  }
	function prepareWidget() {

		barWidgetBtn = widgets.Widget({
          id: 'UltraFM',
          label: 'UltraFM',
          contentURL: self.data.url('widget/bar.html'),
          width: 20,
          panel: widgetPanel
        });
        barWidgetBtn.on("click", function(){
            
        });
	}
  function preparePanel() {

      widgetPanel = panel.Panel({
        width: 244,
        height: 420,
        // contentScriptOptions: {},
        contentURL: self.data.url("widget/widget-test.html"),
        contentScriptFile: [self.data.url("widget/widget.js")]
      });

      widgetPanel.port.on("loadXSPF", function(obj){
            // var url = "http://94.25.53.133:80/ultra-128.mp3.xspf";
            var r = Request({url: obj.url, content: {}, overrideMimeType: "application/xml",
              onComplete: function(response) {
                if(response.statusText === "OK")
                {
                 widgetPanel.port.emit("here_xspf", {code: 200, data: response.text});
                }else{
                  widgetPanel.port.emit("here_xspf", {code: -1, data: ''});
                }
              }
            });
            r.get();
      });

      widgetPanel.port.on("lastfm_trackinfo", function(meth_params){
        lastfm.track.getInfo(meth_params, {
          success: function (responseCode, responseJson) {
            widgetPanel.port.emit("lastfm_trackinfo", {code: responseCode, data: responseJson});
          },
          error: function (responseCode, responseText) {
            widgetPanel.port.emit("lastfm_trackinfo", {code: responseCode, data: responseText});
          }
        });
      });

      widgetPanel.port.on("lastfm_artistinfo", function(meth_params){
        lastfm.artist.getInfo(meth_params, {
          success: function (responseCode, responseJson) {
            widgetPanel.port.emit("lastfm_artistinfo", {code: responseCode, data: responseJson});
          },
          error: function (responseCode, responseText) {
            widgetPanel.port.emit("lastfm_artistinfo", {code: responseCode, data: responseText});
          }
        });
      });

      widgetPanel.port.on("createLastFMSession", function(obj){
        CreateLastFMSession();
      });
      widgetPanel.port.on("open_tab", function(obj){
         tabs.open(obj.url);
      });
      widgetPanel.port.on("beep", function(obj){

      });
      widgetPanel.port.on("takem3u", function(obj){

            var r = Request({url: raioUrls.m3u, content: {}, overrideMimeType: "application/xml",
              onComplete: function(response) {
                if(response.statusText === "OK")
                {
                 widgetPanel.port.emit("here_m3u", {code: 200, data: response.text});
                }else{
                  widgetPanel.port.emit("here_m3u", {code: -1, data: ''});
                }
              }
            });
            r.get();
      });
      //
      widgetPanel.port.on("lastfm_scrobble", function(obj){
        var ts = Math.floor(new Date().getTime()/1000);
        lastfm.track.scrobble({track: obj.track, artist: obj.artist, timestamp: ts}, {key: lastfm_state.key},
          {
          success: function (responseCode, responseJson) {
            widgetPanel.port.emit("lastfm_scrobble", {code: responseCode, data: responseJson});
            console.log(responseJson)
          },
          error: function (responseCode, responseText) {
            widgetPanel.port.emit("lastfm_scrobble", {code: responseCode, data: responseText});
          }
        });
      });

    }
    
    function CreateLastFMSession() {
      tabs.open("http://www.lastfm.ru/api/auth?api_key=645f34cc469fc92baa8d2ab23214a36b");
    }

    exports.getTokenFromUrl = getTokenFromUrl;
	  exports.main = function() { 
	      init();
    };
}());