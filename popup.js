var addr='';

function dataDisplay(r){
	var hashrate=BigNumber(r.data.reportedHashrate).div('1000000').toFixed(1)+' MH/s';
	var unpaid=BigNumber(r.data.unpaid.toString()).div('1000000000000000000').toFixed(8);
	var minpayout=BigNumber(r.data.minPayout.toString()).div('1000000000000000000');
	var coinspd=BigNumber(r.data.coinsPerMin.toString()).times(1440).toFixed(5);
	var coinspm=BigNumber(r.data.coinsPerMin.toString()).times(1440).times(30).toFixed(5);
	var coinspy=BigNumber(r.data.coinsPerMin.toString()).times(1440).times(365).toFixed(5);
	var usdpd=BigNumber(r.data.usdPerMin.toString()).times(1440).toFixed(2);
	var usdpm=BigNumber(r.data.usdPerMin.toString()).times(1440).times(30).toFixed(2);
	var usdpy=BigNumber(r.data.usdPerMin.toString()).times(1440).times(365).toFixed(2);
	// if(r.currency=='USD') var rd=usdpd; else var rd=BigNumber(usdpd).times(BigNumber(r.currency_rate)).toFixed(2);
	var eta=getETA(r);
	r.eta=eta; // so badge doesn't have to recalculate
	var html='Hashrate: '+hashrate+'<br>Balance: '+unpaid+' / '+minpayout+'<br>ETA: '+eta+'<br>';
	// html+='<select style="border:0;background:#fff;font-size:16px;" id="c">';
	// for(let i=0;i<r.rates.length;i++) html+='<option value="'+r.rates[i][0]+'"'+(r.rates[i][0]==r.currency?' selected="selected"':'')+'>'+r.rates[i][0];
	// html+='</select>/day: $'+rd+'<br>';
	html+='<table><tr><th></th><th>Day</th><th>Month</th><th>Year</th></tr><tr><td>ETH</td><td>'+coinspd+'</td><td>'+coinspm+'</td><td>'+coinspy+'</td></tr><tr><td>USD</td><td>'+usdpd+'</td><td>'+usdpm+'</td><td>'+usdpy+'</td></tr></table>';
	// html+='USD/d/m/y: $'+usdpd+' / $'+usdpm+' / $'+usdpy+'<br>';
	html+='<a target="_blank" href="https://ethermine.org/miners/'+addr+'">Dashboard</a> | <a target="_blank" href="https://ethermine.org/miners/'+addr+'/payouts">Payouts</a> | <a target="_blank" href="https://ethermine.org/miners/'+addr+'/settings?ip='+r.data.ip+'">Settings</a>';
	document.getElementById('data_wrap').innerHTML=html;
	// document.getElementById('c').addEventListener('change',()=>{ updateCurrency(); });
	updateBadge(r);
}
function updateCurrency(){
	localStorage.setItem('currency',document.getElementById('c').value);
	updateData(1);
}
		
function updateData(nocache){
	// dont spam the api, just load from storage if opened too quickly
	var lu=localStorage.getItem('lastupdate');
	if(!lu) lu=0;
	var now=Date.now();
	if(now-lu<10000 && !nocache){ // less than 15s interval due to retrieval time
		if(debug) console.log('loading cached data');
		dataDisplay(JSON.parse(localStorage.getItem('lastresponse')));
		return;
	}
	var currency=localStorage.getItem('currency');
	if(!currency) currency='USD';
	var x0=new XMLHttpRequest(); x0.timeout=15000; x0.open("GET","https://api.ethermine.org/miner/"+addr+"/currentStats",true);
	var x1=new XMLHttpRequest(); x1.timeout=15000; x1.open("GET","https://api.ethermine.org/miner/"+addr+"/settings",true);
	var x2=new XMLHttpRequest(); x2.timeout=15000; x2.open("GET","https://ipinfo.io/json",true); // get ip to append to settings url
	// var x3=new XMLHttpRequest(); x3.timeout=15000; x3.open("GET","https://finance.yahoo.com/webservice/v1/symbols/allcurrencies/quote?format=json",true);
	// var xs=[x0,x1,x2,x3];
	var xs=[x0,x1,x2];
	onRequestsComplete(xs, function(xr, xerr){
		for(let i=0;i<xs.length;i++) if(xs[i].status!==200){
			document.getElementById('data_wrap').innerHTML='<div id="error">Error getting data. API seems down.<br>This should be temporary.</div>';
			console.log('api error xs=',xs);
			return;
		}
		try { var r0=JSON.parse(x0.responseText); } catch(e){}
		try { var r1=JSON.parse(x1.responseText); } catch(e){}
		try { var r2=JSON.parse(x2.responseText); } catch(e){}
		// try { var r3=JSON.parse(x3.responseText); } catch(e){}
		if(debug){ console.log('r0=',r0); console.log('r1=',r1); console.log('r2=',r2); /*if(currency!='USD') console.log('r3=',r3);*/ }
		if(!r0 || !r1 || !r2/* || (currency!='USD' && !r3)*/) return;
		r={data:{}}
		for(var a in r0.data) r.data[a]=r0.data[a];
		for(var a in r1.data) r.data[a]=r1.data[a];
		r.data.ip=r2.ip;
		// r.rates=[];
		// var done=[];
		// for(let i=0;i<r3.list.resources.length;i++){
		// 	if(r3.list.resources[i].resource.classname!='Quote') continue;
		// 	if(!r3.list.resources[i].resource.fields.name) continue;
		// 	if(r3.list.resources[i].resource.fields.name.substr(0,4)!='USD/') continue;
		// 	var cc=r3.list.resources[i].resource.fields.name.substr(4);
		// 	if(cc==currency){
		// 		r.currency=currency;
		// 		r.currency_rate=r3.list.resources[i].resource.fields.price;
		// 	}
		// 	if(done.indexOf(cc)===-1){
		// 		r.rates.push([cc,r3.list.resources[i].resource.fields.price]);
		// 		done.push(cc);
		// 	}
		// }
		// r.rates.push(['USD',1]);
		// r.rates.sort();
		// if(!r.currency || currency=='USD') r.currency='USD';
		if(!r.data.unpaid) r.data.unpaid=0;
		if(debug) console.log('r=',r);
		localStorage.setItem('lastupdate',now);
		localStorage.setItem('lastresponse',JSON.stringify(r));
		dataDisplay(r);
	});
	x0.send(); x1.send(); x2.send(); /*x3.send();*/
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