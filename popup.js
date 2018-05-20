var addr='';

function dataDisplay(r){ // { unpaid,hashrate,minpayout }
	var hashrate=BigNumber(r.data.currentStatistics.reportedHashrate).div('1000000').toFixed(1)+' MH/s';
	var unpaid=BigNumber(r.data.currentStatistics.unpaid.toString()).div('1000000000000000000').toFixed(8);
	var minpayout=BigNumber(r.data.settings.minPayout.toString()).div('1000000000000000000');
	document.getElementById('data_wrap').innerHTML='Hashrate: '+hashrate+'<br>Balance: '+unpaid+' / '+minpayout+'<br>ETA: '+getETA(r)+'<br><a target="_blank" href="https://ethermine.org/miners/'+addr+'">View on Ethermine</a>';
	updateBadge(r);
}
		
function updateData(){
	// dont spam the api, just load from storage if opened too quickly
	lu=localStorage.getItem('lastupdate');
	if(!lu) lu=0;
	var now=Date.now()/1000|0;
	if(now-lu<15){
		console.log('loading cached data');
		updateETA(JSON.parse(localStorage.getItem('lastresponse'))); // todo: remove?
		dataDisplay(JSON.parse(localStorage.getItem('lastresponse')));
		return;
	}
	var x=new XMLHttpRequest();
	x.timeout=15000;
	x.open("GET","https://api.ethermine.org/miner/"+addr+"/dashboard",true);
	x.onreadystatechange=function(){
		if(this.readyState==4 && this.status==200){
			try { var r=JSON.parse(x.responseText); } catch(e){}
			console.log('r=',r);
			if(!r) return;
			localStorage.setItem('lastupdate',now);
			localStorage.setItem('lastresponse',x.responseText);
			updateETA(r);
			dataDisplay(r)
		} else if(this.readyState==4){
			var m='Error getting data. API seems down.<br>This should be temporary.';
			document.getElementById('data_wrap').innerHTML='<div id="error">'+m+'</div>';
			if(debug){ console.log('error '+m+' x='); console.log(x); }
		}
	}
	x.send();
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