var debug=1;

function updateBadge(r){
	var hashrate=BigNumber(r.data.currentStatistics.reportedHashrate).div('1000000').toFixed(1)+' MH/s';
	var unpaid=BigNumber(r.data.currentStatistics.unpaid.toString()).div('1000000000000000000').toFixed(8);
	var minpayout=BigNumber(r.data.settings.minPayout.toString()).div('1000000000000000000');
	if(debug) console.log('updating badge to '+unpaid);
	chrome.browserAction.setTitle({ title:'Hashrate: '+hashrate+'\nBalance: '+unpaid+' / '+minpayout+'\nETA: '+getETA(r) });
	chrome.browserAction.setBadgeBackgroundColor({color:'#222'});
	if(unpaid.substr(0,6)==0) unpaid='0'; else unpaid=unpaid.replace(/^0+/,'').substr(0,5);
	chrome.browserAction.setBadgeText({text:unpaid});
}

function updateETA(r){
	//localStorage.setItem('etarr',JSON.stringify([]));
	var etarr=localStorage.getItem('etarr');
	if(debug) console.log('updateETA() etarr before=',etarr);
	// if !etarr or unpaid is smaller than last time, clear array
	if(!etarr || (etarr[0] && etarr[0]>r.data.currentStatistics.unpaid)) etarr=JSON.stringify([]);
	etarr=JSON.parse(etarr);
	if(etarr.length>0 && (etarr[0][0]==r.data.currentStatistics.time || etarr[0][1]==r.data.currentStatistics.unpaid)){
		if(debug) console.log('already have that time / balance, skipping');
		return;
	}
	etarr.unshift([r.data.currentStatistics.time,r.data.currentStatistics.unpaid]);
	if(etarr.length>10) etarr.length=10;
	if(debug) console.log('updateETA() etarr after=',etarr);
	localStorage.setItem('etarr',JSON.stringify(etarr))
}

function getETA(r){
	var togo=BigNumber(r.data.settings.minPayout.toString()).minus(BigNumber(r.data.currentStatistics.unpaid.toString()));
	if(debug) console.log('togo='+togo);
	if(BigNumber(togo).isLessThan('0')) return 'Now';
	// calculate wei per second from etarr
	var etarr=JSON.parse(localStorage.getItem('etarr'));
	if(etarr.length<=1){
		// use last per second if it exists
		var persecond=localStorage.getItem('persecond');
		if(!persecond) return 'Unknown';
		var eta=secstostring(BigNumber(togo).div(persecond).toFixed(0));
		if(debug) console.log('length<=1 persecond='+persecond+' togo='+togo+' eta='+eta);
		return eta;
	}
	var timediff=etarr[0][0]-etarr[etarr.length-1][0];
	var weidiff=BigNumber(etarr[0][1].toString()).minus(BigNumber(etarr[etarr.length-1][1].toString()));
	var persecond=BigNumber(weidiff).div(timediff).toFixed(0);
	localStorage.setItem('persecond',persecond);
	var eta=secstostring(BigNumber(togo).div(persecond).toFixed(0));
	if(debug) console.log('timediff='+timediff+' weidiff='+weidiff+' persecond='+persecond+' eta='+eta);
	if(weidiff==0) return 'No diff'; // shouldnt happen, delete
	return eta;
}

function secstostring(ss) {
    ss = Number(ss);
    var d = Math.floor(ss / 86400);
    var h = Math.floor(ss / 3600);
    var m = Math.floor(ss % 3600 / 60);
    var s = Math.floor(ss % 3600 % 60);
    var dDisplay = d > 0 ? d + 'd' : '';
    var hDisplay = h > 0 ? h + 'h' : '';
    var mDisplay = m > 0 ? m + 'm' : '';
    var sDisplay = s > 0 ? s + 's' : '';
    return dDisplay + hDisplay + mDisplay + sDisplay;
}