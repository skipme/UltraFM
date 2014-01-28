(function(){
	  const self = require("sdk/self");
    const widgets = require('sdk/widget');
    const panel = require('sdk/panel');
	  const Request = require("sdk/request").Request;

    const lastfm = require('lastfm').lastfm;

    var barWidgetBtn = null;
    var widgetPanel = null;



	function init () {

		preparePanel();
		prepareWidget();
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
        contentURL: self.data.url("widget/popup.html"),
        // contentScriptOptions: {},
        contentScriptFile: [self.data.url("widget/background.js"),self.data.url("widget/popup.js")]
      });
      widgetPanel.port.on("takexml", function(url){
            console.log("request", url);
            var r = Request({url: url, content: {}, overrideMimeType: "application/xml",
              onComplete: function(response){
                console.log("request OK", url);
                 widgetPanel.port.emit("herexml", response.text);
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

    }

	  exports.main = function() { 
      console.log(lastfm)
	      init();
    };
}());