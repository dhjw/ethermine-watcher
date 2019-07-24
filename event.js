chrome.alarms.get('update',function(a){
	if(debug) console.log('alarm update a=',a);
	if(!a || (a && a.periodInMinutes!=4)){
		if(debug) console.log('alarm not set or period != 4, setting');
		chrome.alarms.clear('update');
		chrome.alarms.create('update',{periodInMinutes:4});
		if(debug) setTimeout(function(){ chrome.alarms.getAll(function(a){ console.log('alarms='); console.log(a); }); },1000);
	}
	update();
});

chrome.alarms.onAlarm.addListener(function(a){
	update();
});

function update(){
	if(debug) console.log('update()');
	chrome.storage.sync.get(['data'],function(obj){
		if(!obj.data || !obj.data.addr){ if(debug) console.log('no address set, skipping run'); return; }
		var lr=JSON.parse(localStorage.getItem('lastresponse'));
		var nows=Math.floor(Date.now()/1000);
		var skipPayout=lr && lr.addr==obj.data.addr && lr.lastPayout && (nows-lr.lastPayout.paidOn<86400)?1:0;
		var x0=new XMLHttpRequest(); x0.timeout=15000; x0.open("GET","https://api.ethermine.org/miner/"+obj.data.addr+"/currentStats",true);
		var x1=new XMLHttpRequest(); x1.timeout=15000; x1.open("GET","https://api.ethermine.org/miner/"+obj.data.addr+"/settings",true);
		var xs=[x0,x1];
		if(!skipPayout){
			var x2=new XMLHttpRequest(); x2.timeout=15000; x2.open("GET","https://api.ethermine.org/miner/"+obj.data.addr+"/payouts",true);
			xs.push(x2);
		}
		onRequestsComplete(xs, function(xr, xerr){
			for(let i=0;i<xs.length;i++) if(xs[i].status!==200) return console.log('api error xs=',xs);
			try { var r0=JSON.parse(x0.responseText); } catch(e){}
			try { var r1=JSON.parse(x1.responseText); } catch(e){}
			if(!skipPayout) try { var r2=JSON.parse(x2.responseText); } catch(e){}
			if(debug) console.log('r0=',r0,'r1=',r1,'r2=',r2);
			if(!r0 || !r1 || (!skipPayout && !r2)) return console.log('api error xs=',xs);
			r={data:{}}
			for(var a in r0.data) r.data[a]=r0.data[a];
			for(var a in r1.data) r.data[a]=r1.data[a];
			if(!skipPayout) r.lastPayout=r2.data[0]; else r.lastPayout=lr.lastPayout;
			if(!r.data.unpaid) r.data.unpaid=0;
			if(debug) console.log('r=',r);
			updateBadge(r);
		});
		x0.send();
		x1.send();
		if(!skipPayout) x2.send();
	});
}