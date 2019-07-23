var debug='';

// multi sync ajax https://stackoverflow.com/a/34570288
function requestsAreComplete(requests) {
    return requests.every(function (request) {
        return request.readyState == 4;
    });
}

function unsuccessfulRequests(requests) {
    var unsuccessful = requests.filter(function (request) {
         return request.status != 200;
    });
    return unsuccessful.length ? unsuccessful : null;
}

function onRequestsComplete(requests, callback) {
    function sharedCallback() {
        if (requestsAreComplete(requests)) {
            callback(requests, unsuccessfulRequests(requests));
        }
    }
    requests.forEach(function (request) {
        request.onreadystatechange = sharedCallback;
    });
}

function updateBadge(r){
	var hashrate=BigNumber(r.data.reportedHashrate).div('1000000').toFixed(1)+' MH/s';
	var unpaid=BigNumber(r.data.unpaid.toString()).div('1000000000000000000').toFixed(8);
	var minpayout=BigNumber(r.data.minPayout.toString()).div('1000000000000000000');
	if(debug) console.log('updating badge to '+unpaid);
	r=getETA(r);
	chrome.browserAction.setTitle({ title:'Hashrate: '+hashrate+'\nBalance: '+unpaid+' / '+minpayout+'\nETA: '+r.eta });
	chrome.browserAction.setBadgeBackgroundColor({color:'#222'});
	if(unpaid.substr(0,5)==0) unpaid='0'; else unpaid=unpaid.replace(/^0+/,'').substr(0,4);
	chrome.browserAction.setBadgeText({text:unpaid});
}

function getETA(r){
	if(r.eta) return r; // so popup doesn't have to recalculate for badge
	var cpm=BigNumber(r.data.coinsPerMin.toString());
	// if estimate less than 24h, show a note and adjust ETA to 24 hour+1m from last payment
	var togo=BigNumber(r.data.minPayout.toString()).div('1000000000000000000');
	var stogo=BigNumber(togo).div(BigNumber(cpm)).times('60').toFixed(0);
	if(stogo<86400){
		r.lt24h=true;
		stogo=BigNumber(86460)-((Math.floor(Date.now()/1000))-r.lastPayout.paidOn);
		r.eta=togoString(stogo);
	} else {
		r.lt24h=false;
		var togo=BigNumber(r.data.minPayout.toString()).minus(BigNumber(r.data.unpaid.toString())).div('1000000000000000000');
		var stogo=BigNumber(togo).div(BigNumber(cpm)).times('60').toFixed(0);
		r.eta=togoString(stogo);
	}
	if(debug) console.log('getETA() togo='+togo+' cpm='+cpm+' stogo='+stogo+' eta='+r.eta);
	return r;
}

function togoString(x){
	if(x<=0) return 'Now';
	var s=parseInt(x);
	var d=Math.floor(s/86400); s-=d*86400;
	var h=Math.floor(s/3600); s-=h*3600;
	var m=Math.floor(s/60); s-=m*60;
	return (d>0?d+'d':'')+(h>0?h+'h':'')+(m>0?m+'m':'')+(d==0&&h==0&&m==0&&s>0?s+'s':'');
}