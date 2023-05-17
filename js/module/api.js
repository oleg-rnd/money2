export {API}

class API {

constructor(url){
  this.url=url
  this.token=null
  this.privateKeyMinLength=5
  this.reToken=/^[\da-z]{32}$/
  this.cb=chrome||browser
  this.storage=this.cb.storage.local
  this._json2obj={}
}
clearStorage(n){
  if (n) {
    if (n.split(',').includes('token')) this.token=null
    return this.storage.remove(n.split(','))
  } else {
    this.token=null
    return this.storage.clear()
  }
}
json2obj(json){
  if (json===false) return this._json2obj
  return this._json2obj=json?JSON.parse(json):{}
}
remoteRequest(method, url, data, callback){
  var xhr=new XMLHttpRequest(), err,
      prepareResponse=x=>{
        try{var j=JSON.parse(x.response)}catch(err){return x.responseType?x.response:x.responseText}
        //console.log(j)
        return j&&j.result?j:{result:'fail'}
      }
  url=(url||this.url)+((method=='GET' || method=='DELETE') && typeof data=='string' && data!='' ? '?'+data+(data=''):'')
  xhr.open(method, url, true)
  if (url.indexOf(this.url)===0 && this.reToken.test(this.token)) xhr.setRequestHeader('Authorization', 'Bearer '+this.token)
  if (method=='POST' || method=='PUT') {
    if (url.indexOf(this.url)===0) xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8')
    if (callback) xhr.onreadystatechange=()=>{if (xhr.readyState===XMLHttpRequest.DONE) callback(xhr.status, prepareResponse(xhr))}
  } else if (callback) xhr.onload=()=>{callback(xhr.status, prepareResponse(xhr))}
  xhr.send(data)
}
async refreshView(replaceValues){
  var t=this, a=['properties', 'settings', 'settings_author'], b, n, x, el, name, d=document, storage=await t.storage.get(a)
  for (n of a) if (storage[n]===undefined) storage[n]={}
  a={'likes':'likes', 'balance':'balance', 'balanceNotSend':'balance_not_send', 'publicKeyAuthor':'public_key', 'publicKeyCommentator':'public_key'}
  for (n in a) if ((el=d.getElementById(n))) el.innerText=storage?.properties[a[n]] || (a[n]=='public_key'?'-':0)
  name='settings[private_key]'
  d.settings[name].value=storage?.settings[name] || ''
  d.querySelectorAll('form[name=settings], form[name=settings_author]').forEach(form=>{
    form.querySelectorAll('input[name^="'+form.name+'"]').forEach(input=>{
      if (replaceValues===undefined || !!replaceValues) {
        input.value=storage[form.name][input.name]||(input.type=='checkbox'?1:'')
        if (input.type=='checkbox') input.checked=!!storage[form.name][input.name]
      }
    })
  })
  d?.settings?.querySelectorAll('input:not([name="settings[private_key]"]):not([type=hidden]), #btnDeposit, .key-page button').forEach(el=>{el.disabled=!t.token})
  a=['settings', 'settings_author']
  for (n of a) if (d[n][n+'[page][]']) {
    d[n].querySelectorAll('[name="'+n+'[page][]"]').forEach((input, i)=>{if (i>0) input.closest('.row').parentNode.removeChild(input.closest('.row'))})
    b=storage[n][n+'[page][]']||['']
    for (x=1;x<b.length;x++) d[n].querySelector('[name="'+n+'[page][]"]').closest('.row').firstElementChild.firstElementChild.click()
    d[n].querySelectorAll('[name="'+n+'[page][]"]').forEach((input, i)=>{input.value=b[i]})
    if (d[n].querySelectorAll('[name="'+n+'[page][]"]').length==1) d[n][n+'[page][]'].closest('.row').firstElementChild.lastElementChild.disabled=true
  }
  d.querySelectorAll('ul.nav-tabs > li:not(:first-child)').forEach(li=>{li.classList[t.token?'remove':'add']('invisible')})
  d.querySelector('input[name="settings[private_key]"]')?.dispatchEvent(new Event('input'))
  d.querySelectorAll('input[name$="[page][]"]').forEach(input=>{input.dispatchEvent(new Event('input'))})
}
async refreshStorage(){
  var t=this, a=['properties', 'settings', 'settings_author'], storage=await t.storage.get(a)
  if (t.token && (!storage.properties || !storage.settings || !storage.settings_author)) t.remoteRequest('GET', null, 'action=settings_all', async (status, resp)=>{
    if (status==200 && resp?.result=='success') {
      for (let n of a) if (resp.data[n]) await t.storage.set({[n]:resp.data[n]})
      t.refreshView()
    } else t.clearStorage()
    document?.settings?.querySelectorAll('input:not([name="settings[private_key]"]):not([type=hidden]), #btnDeposit, .key-page button').forEach(el=>{el.disabled=!t.token})
    document.querySelectorAll('ul.nav-tabs > li:not(:first-child)').forEach(li=>{li.classList[t.token?'remove':'add']('invisible')})
  })
  document.querySelectorAll('input[name$="[page][]"]').forEach(input=>{input.dispatchEvent(new Event('input'))})
}
async modifyStorage(noRefreshIfModify){
  var t=this, n, saveData=[], storage=await t.storage.get(['modifyTime', 'modifyFormName', 'settings'])
  if (storage.modifyTime && storage.modifyFormName) {
    if (typeof storage.modifyFormName=='string') storage.modifyFormName=[storage.modifyFormName]
    for (n of storage.modifyFormName) {
      let formData=new FormData(document[n]), data={}, pair, p
      for (pair of formData.entries()) {
        p=pair[0]
        if (p.includes('[]')) {
          if (!data[p]) data[p]=[]
          data[p].push(pair[1])
        } else data[p]=pair[1]
      }
      if (data.action) saveData.push(data)
    }
    if (saveData.length) t.remoteRequest('POST', null, JSON.stringify(saveData.length==1?saveData[0]:{action:'multi', actions:saveData}), async (status, resp)=>{
      if (status==200 && resp?.result=='success') {
        if (storage.modifyFormName.length==1) await t.storage.remove(['modifyTime', 'modifyFormName'])
        for (n of resp.data.action=='multi'?resp.data.actions:[resp.data]) {
          if (n.action) await t.storage.set({[n.action]:n})
          if (storage.modifyFormName) storage.modifyFormName=JSON.parse(JSON.stringify(storage.modifyFormName).replace('"'+n.action+'"', '').replace(/, ?(\]|,)/, '$1').replace(/(\[|, ), ?/, '$1'))
        }
        await t.storage.set({modifyFormName:storage.modifyFormName})
        if (!noRefreshIfModify) t.refreshView()
      } else t.refreshView()
    }); else await t.storage.remove(['modifyTime', 'modifyFormName'])
  } else return false
  return true
}
createAccount(e, isRepair){
  var t=this, k=document.settings['settings[private_key]']
  t.storage.remove(['modifyTime', 'modifyFormName'])
  k.classList.remove('is-invalid', 'is-valid')
  if ((isRepair || k.value) && k.value.length<t.privateKeyMinLength) {k.classList.add('is-invalid'); return}
  k.disabled=e.target.disabled=!0
  document.getElementById('btnAccount'+(isRepair?'Create':'Repair')).disabled=!0
  t.remoteRequest('POST', null, '{"action":"account_'+(isRepair?'repair':'create')+'", "private_key":"'+k.value+'" , "eid":"'+(chrome||browser).runtime.id+'"}', async (status, resp)=>{
    k.disabled=e.target.disabled=!1
    if (!isRepair || !t.token) document.getElementById('btnAccount'+(isRepair?'Create':'Repair')).disabled=!1
    if (status!=200 || resp?.result!='success' || !t.reToken.test(resp?.data?.token)) {k.classList.add('is-invalid'); return}
    t.token=resp.data.token
    await t.storage.set({token:resp.data.token, properties:resp.data.properties, settings:resp.data.settings, settings_author:resp.data.settings_author||{}})
    if (!isRepair) {
      t.refreshView(!1)
      await t.storage.set({modifyTime:(new Date).getTime(), modifyFormName:['settings', 'settings_author']})
      setTimeout(()=>{t.modifyStorage(!0)}, 500)
    } else t.refreshView()
    k.classList.add('is-valid')
  })
}
repairAccount(e){
  this.createAccount(e, !0)
}
async checkPublicKey(e){
  var t=this, p=e.target.parentNode.previousElementSibling.querySelector('input'), m, name='public_key', storage=await t.storage.get(['properties'])
  p.classList.remove('is-invalid', 'is-valid')
  if (!p.value || !t.token || !storage.properties || !storage.properties[name]) return
  if (!(new RegExp(p.pattern)).test(p.value.toLowerCase())) p.classList.add('is-invalid')
  else {
    p.readonly=e.target.disabled=!0
    t.remoteRequest('GET', p.getAttribute('data-base-url')+p.value, '', (status, resp)=>{
      p.readonly=e.target.disabled=!1
      if (status!=200) p.classList.add('is-invalid')
      else {
        if ('vc.ru'=='vc.ru' && (m=resp.match(/<meta name="description" content="([^"]+)/)) && (new RegExp('\\b'+storage.properties[name]+'\\b')).test(m[1])) p.classList.add('is-valid')
        else if ('vk.ru'=='vk.ru' && (new RegExp('\\b'+storage.properties[name]+'\\b')).test(resp)) p.classList.add('is-valid')
        else p.classList.add('is-invalid')
      }
    })
  }
}
deposit(e){
  var t=this
  t.remoteRequest('POST', null, '{"action":"account_deposit"}', (status, resp)=>{
    if (status==200 && resp?.result=='success') location.href=resp.data.url
  })
}
}
// end class API
