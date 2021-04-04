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

function loadData(opts,cb){
	// dont spam the api, just load from storage if opened too quickly
	var now=Date.now(), nows=Math.floor(now/1000);
	var lr=JSON.parse(localStorage.getItem('lastresponse'));
	if(!lr) lr={coin:'eth',currency:'USD'};
	if(debug) console.log('lr=',lr);
	if(lr.addr==opts.addr && now-lr.updateTime<29500 && !opts.nocache){
		if(debug) console.log('loading cached data');
		return cb(lr);
	}
	var etc=lr.coin=='etc'?'-etc':'';
	var skipPayout=!opts.nocache && lr.addr==opts.addr && lr.lastPayout && nows-lr.lastPayout.paidOn<86400?1:0;
	var skipRates=lr.rates && lr.ratesTime && nows-lr.ratesTime<21600?1:0;
	if(debug) console.log('skipPayout=',skipPayout,'skipRates=',skipRates);
	var x0=new XMLHttpRequest(); x0.timeout=15000; x0.open('GET','https://api'+etc+'.ethermine.org/miner/'+opts.addr+'/currentStats',true);
	var x1=new XMLHttpRequest(); x1.timeout=15000; x1.open('GET','https://api'+etc+'.ethermine.org/miner/'+opts.addr+'/settings',true);
	// var x4=new XMLHttpRequest(); x4.timeout=15000; x4.open('GET','https://ipinfo.io/json',true); // get ip to append to settings url
	var xs=[x0,x1];
	if(!skipPayout){
		var x2=new XMLHttpRequest(); x2.timeout=15000; x2.open('GET','https://api'+etc+'.ethermine.org/miner/'+opts.addr+'/payouts',true);
		xs.push(x2);
	}
	if(!skipRates){
		var x3=new XMLHttpRequest(); x3.timeout=15000; x3.open('GET','https://cdn.dw1.xyz/ethermine-watcher/rates',true);
		xs.push(x3);
	}
	onRequestsComplete(xs, function(xr, xerr){
		var errors=[];
		for(let i=0;i<xs.length;i++) if(xs[i].status!==200) errors.push(xs[i].status);
		if(errors.length>0){
			// no allow-origin header in 429 responses means we can't actually get the status? how did we get it that one time
			if(errors.indexOf(429)!==-1) cb(0,'API rate limit exceeded. (100 requests per 15 mins)\nThis should only happen if you change the coin or address too quickly.\nWait a little while and try again.');
			else cb(0,'Error getting data from one or more APIs.\nThis should be temporary.');
			return console.log('api error xs=',xs,' codes=',errors);
		}
		try { var r0=JSON.parse(x0.responseText); } catch(e){}
		try { var r1=JSON.parse(x1.responseText); } catch(e){}
		if(!skipPayout) try { var r2=JSON.parse(x2.responseText); } catch(e){}
		if(!skipRates) try { var r3=JSON.parse(x3.responseText); } catch(e){}
		if(debug) console.log('r0=',r0,'r1=',r1,'r2=',r2,'r3=',r3);
		if(!r0 || !r1 || (!skipPayout && !r2) || (!skipRates && !r3)){
			cb(0,'Error getting data from one or more APIs.\nThis should be temporary.');
			return console.log('api error xs=',xs);
		}
		r={addr:opts.addr,data:{}}
		if(typeof r0.data=='object'){
			for(var a in r0.data) r.data[a]=r0.data[a];
			for(var a in r1.data) r.data[a]=r1.data[a];
		} else r.nodata=1;
		if(!skipPayout){
			if(r2.data[0]) r.lastPayout=r2.data[0]; else r.lastPayout=false;
		} else r.lastPayout=lr.lastPayout;
		if(!skipRates){
			r.ratesTime=nows;
			r.rates=r3.rates;
		} else {
			r.ratesTime=lr.ratesTime;
			r.rates=lr.rates;
		}
		if(lr.coin) r.coin=lr.coin; else r.coin='eth';
		if(lr.currency) r.currency=lr.currency; else lr.currency='USD';
		if(!r.data.unpaid) r.data.unpaid=0;
		r.updateTime=now;
		if(debug) console.log('r=',r);
		localStorage.setItem('lastresponse',JSON.stringify(r));
		return cb(r);
	});
	x0.send();
	x1.send();
	if(!skipPayout) x2.send();
	if(!skipRates) x3.send();
}

function updateBadge(r,cs){
	if(debug) console.log('updateBadge()');
	if(!r.nodata){
		r=getETA(r);
		var title='Hashrate: '+cs.hashrate+'\nBalance: '+cs.unpaid+' / '+cs.minpayout+'\nETA: '+r.eta+'\nDay / Month / Year ('+r.currency+')\n'+cs.curpd+' / '+cs.curpm+' / '+cs.curpy;
		var text=cs.unpaid.substr(0,5)==0?'0':cs.unpaid.replace(/^0+/,'').substr(0,4);
	} else var title='No data',text='0';
	chrome.browserAction.setTitle({title:title});
	chrome.browserAction.setBadgeBackgroundColor({color:'#222'});
	chrome.browserAction.setBadgeText({text:text});
}

function getETA(r){
	if(r.eta) return r; // so popup doesn't have to recalculate for badge
	var cpm=BigNumber(r.data.coinsPerMin.toString());
	// if estimate less than 24h, show a note and adjust ETA to 24 hour+1m from last payment
	var togo=BigNumber(r.data.minPayout.toString()).div('1000000000000000000');
	var stogo=BigNumber(togo).div(BigNumber(cpm)).times('60').toFixed(0);
	if(stogo<86400 && r.lastPayout){
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

function calcStats(r){
	return {
		hashrate:BigNumber(r.data.reportedHashrate).div('1000000').toFixed(1)+' MH/s',
		unpaid:BigNumber(r.data.unpaid.toString()).div('1000000000000000000').toFixed(8),
		minpayout:BigNumber(r.data.minPayout.toString()).div('1000000000000000000'),
		coinspd:BigNumber(r.data.coinsPerMin.toString()).times(1440).toFixed(5),
		coinspm:BigNumber(r.data.coinsPerMin.toString()).times(1440).times(30).toFixed(5),
		coinspy:BigNumber(r.data.coinsPerMin.toString()).times(1440).times(365).toFixed(5),
		curpd:BigNumber(r.data.usdPerMin.toString()).times(r.rates[r.currency]).times(1440).toFixed(2),
		curpm:BigNumber(r.data.usdPerMin.toString()).times(r.rates[r.currency]).times(1440).times(30).toFixed(2),
		curpy:BigNumber(r.data.usdPerMin.toString()).times(r.rates[r.currency]).times(1440).times(365).toFixed(2)
	}
}
	
function togoString(x){
	if(x<=0) return 'Now';
	var s=parseInt(x);
	var d=Math.floor(s/86400); s-=d*86400;
	var h=Math.floor(s/3600); s-=h*3600;
	var m=Math.floor(s/60); s-=m*60;
	return (d>0?d+'d':'')+(h>0?h+'h':'')+(m>0?m+'m':'')+(d==0&&h==0&&m==0&&s>0?s+'s':'');
}