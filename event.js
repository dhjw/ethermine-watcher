if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',afterDOMLoaded); else afterDOMLoaded();
function afterDOMLoaded(){
	chrome.alarms.clear('update');
	chrome.alarms.get('update',function(a){
		if(debug){ console.log('alarm update a='); console.log(a); }
		if(!a || (a && a.periodInMinutes!=3)){
			if(debug) console.log('alarm not set or period != 3, setting');
			chrome.alarms.clear('update');
			chrome.alarms.create('update',{periodInMinutes:3});
			if(debug) setTimeout(function(){ chrome.alarms.getAll(function(a){ console.log('alarms='); console.log(a); }); },1000);
		}
		update();
	});

	chrome.alarms.onAlarm.addListener(function(a){
		if(debug) console.log('alarm '+a.name+' fired.');
		if(a.name=='update') update();
	});
	
	function update(){
		if(debug) console.log('update()');
		chrome.storage.sync.get(['data'],function(obj){
			if(!obj.data.addr){ console.log('no address set, skipping run'); return; }
			var x0=new XMLHttpRequest(); x0.timeout=15000; x0.open("GET","https://api.ethermine.org/miner/"+obj.data.addr+"/currentStats",true);
			var x1=new XMLHttpRequest(); x1.timeout=15000; x1.open("GET","https://api.ethermine.org/miner/"+obj.data.addr+"/settings",true);
			var xs=[x0,x1];
			onRequestsComplete(xs, function(xr, xerr){
				for(let i=0;i<xs.length;i++) if(xs[i].status!==200){
					document.getElementById('data_wrap').innerHTML='<div id="error">Error getting data. API seems down.<br>This should be temporary.</div>';
					console.log('api error xs=',xs);
					return;
				}
				try { var r0=JSON.parse(x0.responseText); } catch(e){}
				try { var r1=JSON.parse(x1.responseText); } catch(e){}
				if(debug){ console.log('r0=',r0); console.log('r1=',r1); }
				if(!r0 || !r1) return;
				r={data:{}}
				for(var a in r0.data) r.data[a]=r0.data[a];
				for(var a in r1.data) r.data[a]=r1.data[a];
				if(!r.data.unpaid) r.data.unpaid=0;
				if(debug) console.log('r=',r);
				updateBadge(r);
			});
			x0.send(); x1.send();
		});
	}
}