(function(){
	const self = require("sdk/self");
  const widgets = require('sdk/widget');
  const panel = require('sdk/panel');
	const Request = require("sdk/request").Request;

  const lastfm = require('lastfm').lastfm;
  const tabs = require('sdk/tabs');

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
    tabs.on('ready', function () {
      if(tabs.activeTab.url.contains("lastfm.ru/home?UFM=UltraFMFF"))
      {
        var token = getTokenFromUrl(tabs.activeTab.url);
        console.log("url token found!");
        // 
        lastfm.auth.getSession({token: token}, {
          success: function (responseCode, responseJson) {
            // name, key, subscriber
            if(responseCode !== 200 || typeof responseJson.session === "undefined")
            {
              console.warning("can't create session for lastfm");
            }
            lastfm_state.pushData(responseJson.session);

            widgetPanel.port.emit("LastFMStatus", {isAuthorised: true, name: lastfm_state.userName});
            console.log("session ok: ", responseCode);
          },
          error: function (responseCode, responseText){
             console.log(responseText);
          }
        });
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
        //contentScriptFile: [self.data.url("widget/background.js"),self.data.url("widget/popup.js")]
        //contentURL: self.data.url("widget/popup.html"),
        contentURL: self.data.url("widget/widget-test.html"),
        contentScriptFile: [self.data.url("widget/widget.js")]
      });
      widgetPanel.port.on("takexml", function(url){
            console.log("request", url);
            var r = Request({url: url, content: {}, overrideMimeType: "application/xml",
              onComplete: function(response){
                if(response.statusText === "OK")
                {
                 console.log("request OK", url);
                 widgetPanel.port.emit("herexml", response.text);
                }else{
                  console.log("request Error", url, response.statusText);
                }
              }
            });
            r.get();
      });
      widgetPanel.port.on("lastfm_trackinfo", function(meth_params){
        lastfm.track.getInfo(meth_params, {
          success: function (responseCode, responseJson) {
            widgetPanel.port.emit("here_trackinfo", responseJson);
          },
          error: function (responseCode, responseText)
          {

          }
        });
      });
      widgetPanel.port.on("lastfm_artistinfo", function(meth_params){
        lastfm.artist.getInfo(meth_params, {
          success: function (responseCode, responseJson) {
            widgetPanel.port.emit("here_artistinfo", responseJson);
          },
          error: function (responseCode, responseText)
          {

          }
        });
      });
      widgetPanel.port.on("createLastFMSession", function(obj){
        CreateLastFMSession();
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