var addr='',sopen;

function dataDisplay(r){
	var hashrate=BigNumber(r.data.reportedHashrate).div('1000000').toFixed(1)+' MH/s';
	var unpaid=BigNumber(r.data.unpaid.toString()).div('1000000000000000000').toFixed(8);
	var minpayout=BigNumber(r.data.minPayout.toString()).div('1000000000000000000');
	var coinspd=BigNumber(r.data.coinsPerMin.toString()).times(1440).toFixed(5);
	var coinspm=BigNumber(r.data.coinsPerMin.toString()).times(1440).times(30).toFixed(5);
	var coinspy=BigNumber(r.data.coinsPerMin.toString()).times(1440).times(365).toFixed(5);
	var curpd=BigNumber(r.data.usdPerMin.toString()).times(r.rates[r.currency]).times(1440).toFixed(2);
	var curpm=BigNumber(r.data.usdPerMin.toString()).times(r.rates[r.currency]).times(1440).times(30).toFixed(2);
	var curpy=BigNumber(r.data.usdPerMin.toString()).times(r.rates[r.currency]).times(1440).times(365).toFixed(2);
	var r=getETA(r);
	var html='<div id="mid_wrap">Hashrate: '+hashrate+'<br>Balance: '+unpaid+' / '+minpayout+'<br>ETA: '+r.eta+(r.lt24h?'<span class="lt24h" title="Total estimated time to payment threshold less than 24h from last payment. ETA set to 24h from then.">?</span>':'')+'<br>';
	html+='</div>';
	var csel='<select id="c">';
	for(var c in r.rates) csel+='<option value="'+c+'"'+(c==r.currency?' selected="selected"':'')+'>'+c;
	csel+='</select>';
	html+='<table><tr><th></th><th>Day</th><th>Month</th><th>Year</th></tr><tr><td>ETH</td><td>'+coinspd+'</td><td>'+coinspm+'</td><td>'+coinspy+'</td></tr><tr><td style="padding:0">'+csel+'</td><td>'+curpd+'</td><td>'+curpm+'</td><td>'+curpy+'</td></tr></table>';
	html+='<a target="_blank" href="https://ethermine.org/miners/'+addr+'">Dashboard</a> | <a target="_blank" href="https://ethermine.org/miners/'+addr+'/payouts">Payouts</a> | <a target="_blank" href="https://ethermine.org/miners/'+addr+'/settings?ip='+r.data.ip+'">Settings</a>';
	document.getElementById('data_wrap').innerHTML=html;
	document.getElementById('c').addEventListener('change',()=>{ document.getElementById('c').blur(); updateCurrency(r); });
	// keep track if currency select is open so we can skip updates if so
	sopen=false;
	document.getElementById('c').addEventListener('click',()=>{ sopen=!sopen; });
	document.getElementById('c').addEventListener('blur',()=>{ if(sopen) sopen=false;});
	document.addEventListener('keyup',function(e){ if(e.keyCode==27) if(sopen) sopen=false; });
	updateBadge(r);
}
function updateCurrency(r){
	r.currency=document.getElementById('c').value;
	localStorage.setItem('lastresponse',JSON.stringify(r));
	updateData();
}
		
function updateData(nocache){
	if(sopen) return;
	// dont spam the api, just load from storage if opened too quickly
	var lu=localStorage.getItem('lastupdate');
	if(!lu) lu=0;
	var lr=JSON.parse(localStorage.getItem('lastresponse'));
	var now=Date.now(), nows=Math.floor(now/1000);
	if(now-lu<27500 && !nocache){ // less than interval due to retrieval time
		if(debug) console.log('loading cached data');
		return dataDisplay(lr);
	}
	var skipPayout=lr && lr.addr==addr && lr.lastPayout && nows-lr.lastPayout.paidOn<86400?1:0;
	var skipRates=lr && lr.rates && lr.ratesTime && nows-lr.ratesTime<21600?1:0;
	if(debug) console.log('skipPayout=',skipPayout,'skipRates=',skipRates);
	var x0=new XMLHttpRequest(); x0.timeout=15000; x0.open("GET","https://api.ethermine.org/miner/"+addr+"/currentStats",true);
	var x1=new XMLHttpRequest(); x1.timeout=15000; x1.open("GET","https://api.ethermine.org/miner/"+addr+"/settings",true);
	var x4=new XMLHttpRequest(); x4.timeout=15000; x4.open("GET","https://ipinfo.io/json",true); // get ip to append to settings url
	var xs=[x0,x1,x4]
	if(!skipPayout){
		var x2=new XMLHttpRequest(); x2.timeout=15000; x2.open("GET","https://api.ethermine.org/miner/"+addr+"/payouts",true);
		xs.push[x2];
	}
	if(!skipRates){
		var x3=new XMLHttpRequest(); x3.timeout=15000; x3.open("GET","https://api.exchangeratesapi.io/latest",true);
		xs.push[x3];
	}
	onRequestsComplete(xs, function(xr, xerr){
		for(let i=0;i<xs.length;i++) if(xs[i].status!==200){
			document.getElementById('data_wrap').innerHTML='<div id="error">Error getting data from one or more APIs.<br>This should be temporary.</div>';
			return console.log('api error xs=',xs);
		}
		try { var r0=JSON.parse(x0.responseText); } catch(e){}
		try { var r1=JSON.parse(x1.responseText); } catch(e){}
		if(!skipPayout) try { var r2=JSON.parse(x2.responseText); } catch(e){}
		if(!skipRates) try { var r3=JSON.parse(x3.responseText); } catch(e){}
		try { var r4=JSON.parse(x4.responseText); } catch(e){}
		if(debug) console.log('r0=',r0,'r1=',r1,'r2=',r2,'r3=',r3,'r4=',r4);
		if(!r0 || !r1 || (!skipPayout && !r2) || (!skipRates && !r3) || !r4){
			document.getElementById('data_wrap').innerHTML='<div id="error">Error getting data from one or more APIs.<br>This should be temporary.</div>';
			return console.log('api error xs=',xs);
		}
		r={data:{}}
		for(var a in r0.data) r.data[a]=r0.data[a];
		for(var a in r1.data) r.data[a]=r1.data[a];
		if(!skipPayout){
			r.lastPayout=r2.data[0];
			r.addr=addr;
		} else {
			r.lastPayout=lr.lastPayout;
			r.addr=lr.addr;
		}
		if(!skipRates){
			var tmp=[];
			// convert EUR rates to USD rates
			r3.rates.EUR=1;
			for(var c in r3.rates){
				var inusd=new BigNumber(r3.rates[c]).div(r3.rates.USD);
				tmp.push([c,inusd]);
				if(lr && c==lr.currency) r.currency=c;
			}
			tmp.sort();
			r.rates={};
			for(let i=0;i<tmp.length;i++) r.rates[tmp[i][0]]=tmp[i][1];
			r.ratesTime=nows;
		} else {
			r.currency=lr.currency;
			r.ratesTime=lr.ratesTime;
			r.rates=lr.rates;
		}
		if(!r.currency) r.currency='USD';
		r.data.ip=r4.ip;
		if(!r.data.unpaid) r.data.unpaid=0;
		if(debug) console.log('r=',r);
		localStorage.setItem('lastupdate',now);
		localStorage.setItem('lastresponse',JSON.stringify(r));
		dataDisplay(r);
	});
	x0.send();
	x1.send();
	if(!skipPayout) x2.send();
	if(!skipRates) x3.send();
	x4.send();
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
			updateData();
			setInterval(updateData,30000);
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
			if(error!='first') if(obj.data.addr) localStorage.setItem('addr',obj.data.addr);
			chrome.storage.sync.set({data:{ addr: '' }});
			if(error=='noaddr') document.body.innerHTML+='<div id="error">Please enter an address.</div>';
			else if(error=='invalidaddr'){ document.body.innerHTML+='<div id="error">Not a valid address. Please try again.</div>'; localStorage.setItem('addr',''); }
			document.body.innerHTML+='Enter your miner wallet address below:<br><input id="addr" size="30"> <button id="add">Add</button><br>';
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