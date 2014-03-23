const ss = require("sdk/simple-storage");

function LFM()
{
	var store = ss.storage;

	if(!store.LFM)
		store.LFM = { session: null};
	return store.LFM;
}
function OPTS()
{
	var store = ss.storage;

	if(!store.OPTS)
		store.OPTS = { options: null};
	return store.OPTS;
}
// ---------
function getLFM () {
	return LFM().session;
}

function setLFM (sess) {
	LFM().session = sess;
}

function clearLFM () {
	LFM().session = {};
}

// ---------
function getOPTS () {
	return OPTS().options;
}

function setOPTS (obj) {
	OPTS().options = obj;
}

exports.getLFMSession = getLFM;
exports.saveLFMSession = setLFM;
exports.clearLFMSession = clearLFM;

exports.getOptions = getOPTS;
exports.saveOptions = setOPTS;
