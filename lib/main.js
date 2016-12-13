(function(){

  const sys_version = require('sdk/system/xul-app');

  var is_Firefox = function() {return (sys_version.name === "Firefox");}
  var is_SupportActionButton = function() {return is_Firefox() && (new Number(sys_version.version.split(".")[0]) >= 29);}
  var is_SupportPanelPosition = function() {return is_Firefox() && (new Number(sys_version.version.split(".")[0]) >= 30);}
  var is_Australis = function() {return is_SupportActionButton();}

  var widgets = null;
  var ActionButton = null;

	const self = require("sdk/self");
  var _ = require("sdk/l10n").get;
  const panel = require('sdk/panel');
	const Request = require("sdk/request").Request;

  const lfo = require('./lastfm').lastfm;
  const lastfm = new lfo({apiKey: "645f34cc469fc92baa8d2ab23214a36b", apiSecret: "9c6c9875d868c79365dbe9d365ba6f8d"});
  const radioUrls = 
  { 
    //m3u: "http://mp3.nashe.ru/ultra-128.mp3.m3u", 
    m3u: "http://nodes.apphb.com/home/rr?u=ufm",
    mp3: null,
    xspf: null
  };

  const tabs = require('sdk/tabs');
  const notifications = require("sdk/notifications");

  const modelOpts = require('./modelOpts');

  var barWidgetBtn = null;
  var widgetPanel = null;
  
  var lastfm_state = { sessDataAt: null, userName: null, key: null, isSubscriber: false,
    pushData: function(lastfmResponse){
      if(lastfmResponse !== null && 
        typeof lastfmResponse !== "undefined" && 
        lastfmResponse.key !== null && lastfmResponse.key !== undefined)
      {
        this.userName = lastfmResponse.name;
        this.key = lastfmResponse.key;
        this.isSubscriber = lastfmResponse.subscriber == 1;
        widgetPanel.port.emit("LastFMStatus", {isAuthorised: true, name: this.userName, at: this.sessDataAt});
      }else{
        widgetPanel.port.emit("LastFMStatus", {isAuthorised: false, name: "unauthorised", at: null});
      }
    },
    restoreData: function(resp)
    {
      if(resp.at === null || resp.at === undefined)
      {  
        resp.at = new Date();
      }
      this.sessDataAt = resp.at;
      this.pushData(resp);
    },
    closeState: function(){
      this.userName = null;
      this.key = null;
      this.isSubscriber = false;
      this.sessDataAt = null;
       widgetPanel.port.emit("LastFMStatus", {isAuthorised: false, name: "unauthorised"});
    },
    getData: function(){
      return {name: this.userName, key: this.key, subscriber: this.isSubscriber, at: this.sessDataAt};
    }
  };

	function init () {
    tabs.on('ready', function (tokentab) {
      // console.log(tokentab.url)
      if(tokentab.url.match(/last\.fm.+UFM=UltraFMFF&token=/) !== null)//contains("lastfm.ru/home?UFM=UltraFMFF"))
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
            if(modelOpts.getOptions().saveLFMSess)
              modelOpts.saveLFMSession(lastfm_state.getData());
            
            // console.log("session ok: ", responseCode);
            
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
		
    // console.log("restore from storage")
    lastfm_state.restoreData(modelOpts.getLFMSession());
    widgetPanel.port.emit("options", modelOpts.getOptions());
	}
  function getTokenFromUrl(query){
    if(query.indexOf("?")>0)
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

      if(is_Australis() && is_SupportPanelPosition())
      {
        barWidgetBtn = ActionButton({
            id: "UltraFM",
            label: "UltraFM",
            icon: {
              "32": "./widget/icon.32.png",
              "64": "./widget/icon.64.png"
            },
            onClick: function(state) {
                  widgetPanel.show({position: barWidgetBtn});
            }
          });

      }else{
    		barWidgetBtn = widgets.Widget({
              id: 'UltraFM',
              label: 'UltraFM',
              contentURL: self.data.url('widget/bar.html'),
              width: 20,
              panel: widgetPanel
        });
      }
	}
  function preparePanel() {

      widgetPanel = panel.Panel({
        width: 244,
        height: 420,
        //position: barWidgetBtn,
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
      widgetPanel.port.on("closeLastFMSession", function(obj){
        lastfm_state.closeState();
        modelOpts.clearLFMSession();
      });
      widgetPanel.port.on("open_tab", function(obj){
         tabs.open(obj.url);
      });
      widgetPanel.port.on("beep", function(obj){

      });
      widgetPanel.port.on("options", function(obj){
        
        if(obj.saveLFMSess)
           modelOpts.saveLFMSession(lastfm_state.getData());
        else
           modelOpts.clearLFMSession();
        
        modelOpts.saveOptions(obj)
      });
      widgetPanel.port.on("takem3u", function(obj){

            var r = Request({url: radioUrls.m3u+"&t="+obj.tag, content: {}, overrideMimeType: "application/xml",
              onComplete: function(response) {
                if(response.statusText === "OK")
                {
                  console.log(response.text)
                 widgetPanel.port.emit("here_m3u", {code: 200, data: {m3u: response.text, tag: obj.tag}});
                }else{
                  widgetPanel.port.emit("here_m3u", {code: -1, data: {m3u: '', tag: obj.tag}});
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
      //
      widgetPanel.port.on("taketags", function(obj){
        widgetPanel.port.emit("here_tags_darling", {code: 200, data: {tags: '64,128,192'}});
      });

    //
  }
    
    function CreateLastFMSession() {
      tabs.open("http://www.lastfm.ru/api/auth?api_key=645f34cc469fc92baa8d2ab23214a36b");
    }

    exports.getTokenFromUrl = getTokenFromUrl;
	  exports.main = function() { 
        if(is_SupportActionButton() && is_SupportPanelPosition())
        {      
          ActionButton = require("sdk/ui/button/action").ActionButton;
        }
        else 
        {
            widgets = require('sdk/widget');
        }
	      init();
    };
 exports.onUnload = function (reason) {
      for (var i = 0; i< tabs.length; i++) {
        tabs[i].destroy();// why i need this? because if not do this we have errors on off/on addon:
        /*
        JavaScript error: resource://gre/modules/addons/XPIProvider.jsm -> jar:file:///C:/Users/USER/AppData
/Roaming/Mozilla/Firefox/Profiles/YDEV/extensions/jid1-CxAfu9DDH0Q8gQ@jetpack.xpi!/bootstrap.js -> r
esource://gre/modules/commonjs/toolkit/loader.js -> resource://gre/modules/commonjs/sdk/tabs/tab-fir
efox.js, line 98: TypeError: can't access dead object
        */
      };
    };
}());