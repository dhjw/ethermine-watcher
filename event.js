chrome.alarms.get('update',function(a){
	if(debug) console.log('alarm update a=',a);
	if(!a || (a && a.periodInMinutes!=4)){
		if(debug) console.log('alarm not set or period != 4, setting');
		chrome.alarms.clear('update');
		chrome.alarms.create('update',{periodInMinutes:4});
		if(debug) setTimeout(function(){ chrome.alarms.getAll(function(a){ console.log('alarms=',a); }); },1000);
	}
	update();
});

chrome.alarms.onAlarm.addListener(function(a){
	update();
});

function update(){
	if(debug) console.log('update()');
	chrome.storage.sync.get(['data'],function(obj){
		if(!obj.data || !obj.data.addr) if(debug) return console.log('no address set, skipping run');
		if(obj.data.addr.substr(0,2)!='0x') obj.data.addr='0x'+obj.data.addr; // so matches popup addr cache. should standardize on storage. api takes either
		loadData({
			addr:obj.data.addr
		},(r,e)=>{
			if(e) return console.log('error: '+e);
			cs=calcStats(r);
			updateBadge(r,cs);
			// todo: send msg to popup to refresh, if open, so it always matches badge
		});
	
	});
}