// chrome.contextMenus.removeAll();
// chrome.contextMenus.create({
//       title: "Transactions",
//       contexts: ["browser_action"],
//       onclick: function() {
//         window.open(chrome.extension.getURL("tx.html"));
//       }
// });
  

chrome.notifications.onButtonClicked.addListener(function(ni,bi){
		chrome.storage.local.get('notifs',function(o){
			//if(debug){ console.log('notifClicked ni='+ni+' bi='+bi+' notifs='); console.log(o.notifs); }
			var url=o.notifs[ni][bi];
			window.open(url,'_blank');
		});
});

chrome.notifications.onClosed.addListener(function(id,bu){
	chrome.storage.local.get('notifs',function(o){
		//if(debug){ console.log('notification closed, id='+id+' byuser='+bu); }
		delete o.notifs[id];
		//if(debug){ console.log('new notifs='); console.log(o.notifs); }
		chrome.storage.local.set({notifs:o.notifs});
	});
});


// if(debug){
// 	var m=new SpeechSynthesisUtterance('event page loaded');
// 	speechSynthesis.speak(m);
// 	chrome.runtime.onSuspend.addListener(function(a){
// 		var m=new SpeechSynthesisUtterance('suspending event page');
// 		speechSynthesis.speak(m);
// 	});
// 	chrome.runtime.onSuspendCanceled.addListener(function(a){
// 		var m=new SpeechSynthesisUtterance('suspend canceled');
// 		speechSynthesis.speak(m);
// 	});
// }

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
		updateBadge();
	});

	chrome.alarms.onAlarm.addListener(function(a){
		if(debug) console.log('alarm '+a.name+' fired.');
		if(a.name=='update'||a.name=='update_test') updateBadge();
	});
	
	function updateBadge(){
		chrome.storage.sync.get(['data'],function(obj){
			if(!obj.data.addr){ console.log('no address set, skipping run'); return; }
			var x0=new XMLHttpRequest(); x0.timeout=15000; x0.open("GET","https://api.ethermine.org/miner/"+obj.data.addr+"/dashboard",true);
			var xs=[x0];
			onRequestsComplete(xs, function(xr, xerr){
				try { var resp=JSON.parse(x0.responseText); } catch(e){}
				console.log('resp=',resp);
				if(xs[0].status!==200 || xs[0].responseText=='' || !resp){
					var m='Error getting data. API seems down.<br>This should be temporary.';
					document.getElementById('body_wrap').innerHTML='<span id="error">'+m+'</span>';
					if(debug){ console.log('error '+m+' xs='); console.log(xs); }
					return;
				}
				var unpaid=BigNumber(resp.data.currentStatistics.unpaid.toString()).div('1000000000000000000').toFixed(8);
				if(debug) console.log('updating badge to '+unpaid);
				chrome.browserAction.setBadgeText({text: unpaid.replace(/^0+/,'')/*.substr(0,4)*/});
				chrome.browserAction.setBadgeBackgroundColor({color: badgeBgColor});

			});
			x0.send();
		});
	}
}