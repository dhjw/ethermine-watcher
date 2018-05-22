var addr='';

function dataDisplay(r){
	var hashrate=BigNumber(r.data.reportedHashrate).div('1000000').toFixed(1)+' MH/s';
	var unpaid=BigNumber(r.data.unpaid.toString()).div('1000000000000000000').toFixed(8);
	var minpayout=BigNumber(r.data.minPayout.toString()).div('1000000000000000000');
	var usdpd=BigNumber(r.data.usdPerMin.toString()).times(1440).toFixed(2);
	if(alt_currency) var altpd=BigNumber(usdpd).times(BigNumber(r.data.usdalt)).toFixed(2);
	var eta=getETA(r);
	r.eta=eta; // so badge doesn't have to recalculate
	document.getElementById('data_wrap').innerHTML='Hashrate: '+hashrate+'<br>Balance: '+unpaid+' / '+minpayout+'<br>ETA: '+eta+'<br>'+(!alt_currency ? 'USD/day: $'+usdpd+'<br>':'')+(alt_currency ? alt_currency+'/day: $'+altpd+'<br>':'')+'<a target="_blank" href="https://ethermine.org/miners/'+addr+'">Dashboard</a> | <a target="_blank" href="https://ethermine.org/miners/'+addr+'/payouts">Payouts</a> | <a target="_blank" href="https://ethermine.org/miners/'+addr+'/settings?ip='+r.data.ip+'">Settings</a>';
	updateBadge(r);
}
		
function updateData(){
	// dont spam the api, just load from storage if opened too quickly
	lu=localStorage.getItem('lastupdate');
	if(!lu) lu=0;
	var now=Date.now()/1000|0;
	if(now-lu<15){
		console.log('loading cached data');
		dataDisplay(JSON.parse(localStorage.getItem('lastresponse')));
		return;
	}
	var x0=new XMLHttpRequest(); x0.timeout=15000; x0.open("GET","https://api.ethermine.org/miner/"+addr+"/currentStats",true);
	var x1=new XMLHttpRequest(); x1.timeout=15000; x1.open("GET","https://api.ethermine.org/miner/"+addr+"/settings",true);
	var x2=new XMLHttpRequest(); x2.timeout=15000; x2.open("GET","https://ipinfo.io/json",true); // get ip to append to settings url
	if(alt_currency){
		var x3=new XMLHttpRequest(); x3.timeout=15000; x3.open("GET","http://www.mycurrency.net/service/rates",true); // get ip to append to settings url
		var xs=[x0,x1,x2,x3];
	} else var xs=[x0,x1,x2];
	onRequestsComplete(xs, function(xr, xerr){
		for(let i=0;i<xs.length;i++) if(xs[i].status!==200){
			document.getElementById('data_wrap').innerHTML='<div id="error">Error getting data. API seems down.<br>This should be temporary.</div>';
			console.log('api error xs=',xs);
			return;
		}
		try { var r0=JSON.parse(x0.responseText); } catch(e){}
		try { var r1=JSON.parse(x1.responseText); } catch(e){}
		try { var r2=JSON.parse(x2.responseText); } catch(e){}
		if(alt_currency) try { var r3=JSON.parse(x3.responseText); } catch(e){}
		if(debug){ console.log('r0=',r0); console.log('r1=',r1); console.log('r2=',r2); if(alt_currency) console.log('r3=',r3); }
		if(!r0 || !r1 || !r2 || (alt_currency && !r3)) return;
		r={data:{}}
		for(var a in r0.data) r.data[a]=r0.data[a];
		for(var a in r1.data) r.data[a]=r1.data[a];
		r.data.ip=r2.ip;
		if(alt_currency) for(let i=0;i<r3.length;i++) if(r3[i].currency_code==alt_currency){ r.data.usdalt=r3[i].rate; break; }
		if(!r.data.unpaid) r.data.unpaid=0;
		if(debug) console.log('r=',r);
		localStorage.setItem('lastupdate',now);
		localStorage.setItem('lastresponse',JSON.stringify(r));
		dataDisplay(r);
	});
	x0.send(); x1.send(); x2.send(); x3.send();
}

function footer(){
	document.body.innerHTML+='<div id="foot_wrap"></div>';
}

document.addEventListener('DOMContentLoaded',()=>{
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
			updateData();
			setInterval(updateData,15000);
			document.getElementById('rw').addEventListener('click',function(){
				if(confirm('Are you sure you want to remove the address?')){
					chrome.storage.sync.set({data:{addr:''}});
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