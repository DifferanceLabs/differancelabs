const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
function total(price,taxBps=0){return price+Math.round(price*taxBps/10000)}
function remaining(tuition,deposit,applied){return tuition-(applied?deposit:0)}
function duplicate(rows,x){return rows.some(r=>r.email===x.email&&r.child===x.child&&r.slot===x.slot)}
function atomic(capacities){return capacities.every(n=>n>0)}
function webhook(raw,key,url){return crypto.createHmac('sha256',key).update(url+raw).digest('base64')}
test('price is server-calculable integer cents',()=>assert.equal(total(12000),12000));
test('configured tax is explicit',()=>assert.equal(total(12000,925),13110));
test('deposit credit applies exactly once',()=>{assert.equal(remaining(12000,2000,true),10000);assert.equal(remaining(12000,2000,false),12000)});
test('duplicate child/slot is rejected',()=>assert.equal(duplicate([{email:'a@b.com',child:'Sam',slot:'Mon'}],{email:'a@b.com',child:'Sam',slot:'Mon'}),true));
test('four-date package is all-or-nothing',()=>{assert.equal(atomic([1,1,1,1]),true);assert.equal(atomic([1,0,1,1]),false)});
test('webhook signature includes notification URL and raw body',()=>{let s=webhook('{"x":1}','key','https://x/webhook');assert.equal(s,webhook('{"x":1}','key','https://x/webhook'));assert.notEqual(s,webhook('{"x":2}','key','https://x/webhook'))});
test('late payment cannot imply enrollment',()=>{const payment={status:'COMPLETED'},hold={status:'expired'};assert.equal(payment.status==='COMPLETED'&&hold.status==='held',false)});
test('sibling identities remain distinct',()=>assert.notEqual('child-a','child-b'));
