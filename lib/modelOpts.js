var ss = require("sdk/simple-storage");

function LFM()
{
	var store = ss.storage;

	if(!store.LFM)
		store.LFM = { session: null};
	return store.LFM;
}

function getLFM () {
	return LFM().session;
}

function setLFM (sess) {
	LFM().session = sess;
}

function clearLFM () {
	LFM().session = {};
}
exports.getLFMSession = getLFM;
exports.saveLFMSession = setLFM;
exports.clearLFMSession = clearLFM;
