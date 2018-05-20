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
			var x=new XMLHttpRequest();
			x.timeout=15000;
			x.open("GET","https://api.ethermine.org/miner/"+obj.data.addr+"/dashboard",true);
			x.onreadystatechange=function(){
				if(this.readyState==4 && this.status==200){
					try { var r=JSON.parse(x.responseText); } catch(e){}
					console.log('r=',r);
					if(!r) return;
					updateETA(r);
					updateBadge(r);
				} else if(this.readyState==4){
					var m='Error getting data. API seems down.<br>This should be temporary.';
					if(debug){ console.log('error '+m+' xs='); console.log(xs); }
				}
			}
			x.send();
		});
	}
}