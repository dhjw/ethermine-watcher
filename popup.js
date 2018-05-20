/* BCH Tips popup.js */

var addr='';

function dataDisplay(data){ // { unpaid,hashrate,minpayout }\
	var hashrate=BigNumber(data.hashrate).div('1000000').toFixed(2);
	var unpaid=BigNumber(data.unpaid.toString()).div('1000000000000000000').toFixed(8);
	var minpayout=BigNumber(data.minpayout.toString()).div('1000000000000000000');
	document.getElementById('data_wrap').innerHTML='Hashrate: '+hashrate+'<br>Unpaid: '+unpaid+'<br>minPayout: '+minpayout;
	chrome.browserAction.setBadgeText({text: unpaid.replace(/^0+/,'').substr(0,5)});
	chrome.browserAction.setBadgeBackgroundColor({color: badgeBgColor});
}
		
function updateBalance(){
	// dont spam the api, just load from storage if opened too quickly
	lu=localStorage.getItem('lastupdate');
	if(!lu) lu=0;
	var now=Date.now()/1000|0;
	if(now-lu<60){
		console.log('loading cached data');
		dataDisplay({unpaid:localStorage.getItem('lastunpaid'),hashrate:localStorage.getItem('lasthashrate'),minpayout:localStorage.getItem('lastminpayout')});
		return;
	}
	var x0=new XMLHttpRequest(); x0.timeout=15000; x0.open("GET","https://api.ethermine.org/miner/"+addr+"/dashboard",true);
	var xs=[x0];
	onRequestsComplete(xs, function(xr, xerr){
		try { var resp=JSON.parse(x0.responseText); } catch(e){}
		console.log('resp=',resp);
		if(xs[0].status!==200 || xs[0].responseText=='' || !resp){
			var m='Error getting data. API seems down.<br>This should be temporary.';
			document.getElementById('data_wrap').innerHTML='<span id="error">'+m+'</span>';
			if(debug){ console.log('error '+m+' xs='); console.log(xs); }
			return;
		}
		localStorage.setItem('lastupdate',now);
		localStorage.setItem('lastunpaid',resp.data.currentStatistics.unpaid);
		localStorage.setItem('lasthashrate',resp.data.currentStatistics.reportedHashrate);
		localStorage.setItem('lastminpayout',resp.data.settings.minPayout);
		dataDisplay({unpaid:resp.data.currentStatistics.unpaid,hashrate:resp.data.currentStatistics.reportedHashrate,minpayout:resp.data.settings.minPayout})
	});
	x0.send();
}

function footer(){
	document.body.innerHTML+='<div id="foot_wrap"></div>';
}

document.addEventListener('DOMContentLoaded', () => {
	chrome.storage.sync.get(['data'],function(obj){
		if(debug) console.log(obj);
		if(!obj.data || !obj.data.addr) var error='first'; // no error message
		if(!error && !obj.data.addr) var error='noaddr';
		if(!error){
			if(debug) console.log('testing addr');
			if(obj.data.addr.substr(0,2)!='0x') obj.data.addr='0x'+obj.data.addr;
			var p=/^0x[a-fA-F0-9]{40}$/;
			if(!p.test(obj.data.addr)) var error='invalidaddr';
		}
		if(!error){
			addr=obj.data.addr;
			document.body.innerHTML+='<div id="addr_wrap">'+addr.substr(2)+' <a id="rw" href="javascript:;" title="Remove address">x</a></div><div id="data_wrap"></div>';
			footer();
			updateBalance();
			setInterval(updateBalance,15000);
			document.getElementById('rw').addEventListener('click',function(){
				if(confirm('Are you sure you want to remove the address?')){
					chrome.storage.sync.set({data:{ addr: '' }});
					chrome.browserAction.setBadgeText({text:''});
					location.reload();
				}
			});
		} else {
			// address entry page
			if(debug) console.log('error='+error);
			if(error!='first'){
				if(obj.data.addr) localStorage.setItem('addr',obj.data.addr);
			}
			chrome.storage.sync.set({data:{ addr: '' }});
			if(error=='noaddr') document.body.innerHTML+='<div id="error">Please enter an address.</div>';
			else if(error=='invalidaddr'){ document.body.innerHTML+='<div id="error">Not a valid address. Please try again.</div>'; localStorage.setItem('addr',''); }
			document.body.innerHTML+='Enter your miner wallet address below:<br><input id="addr" size="30"> <button id="add">Add</button><br>';
			footer();
			document.getElementById('addr').value=localStorage.getItem('addr');
			if(document.getElementById('addr').value==='') document.getElementById('addr').focus();
			document.getElementById('addr').addEventListener('blur', addrblur = function(){ localStorage.setItem('addr', document.getElementById('addr').value); });
			document.getElementById('addr').addEventListener('focus', addrsel = function(){ document.getElementById('addr').select(); });
			document.getElementById('add').addEventListener('click',function(){
				// save wallet infos
				chrome.storage.sync.set({data:{ addr: document.getElementById('addr').value }});
				document.getElementById('addr').removeEventListener('blur',addrblur);
				localStorage.setItem('addr','');
				location.reload();
			});
		}
	});
});