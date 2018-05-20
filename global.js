var debug=1;

function updateBadge(r){
	var hashrate=BigNumber(r.data.currentStatistics.reportedHashrate).div('1000000').toFixed(1)+' MH/s';
	var unpaid=BigNumber(r.data.currentStatistics.unpaid.toString()).div('1000000000000000000').toFixed(8);
	var minpayout=BigNumber(r.data.settings.minPayout.toString()).div('1000000000000000000');
	if(debug) console.log('updating badge to '+unpaid);
	chrome.browserAction.setTitle({ title:'Balance: '+unpaid+'\nHashrate: '+hashrate });
	if(unpaid.substr(0,6)==0) unpaid='0'; else unpaid=unpaid.replace(/^0+/,'').substr(0,5);
	chrome.browserAction.setBadgeText({text:unpaid});
	chrome.browserAction.setBadgeBackgroundColor({color:'#222'});
}