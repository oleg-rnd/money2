class BgAPI {

constructor(url){
  this.url=url
  this.reToken=/^[\da-z]{32}$/
  this.cb=chrome||browser
  this.storage=this.cb.storage.local
}
async remoteRequest(method, url, data, callback){
  var h={}, status, token=(await this.storage.get('token')).token
  url=(url||this.url)+((method=='GET' || method=='DELETE') && typeof data=='string' && data!='' ? '?'+data+(data=''):'')
  if (url.indexOf(this.url)===0 && this.reToken.test(token)) h['Authorization']='Bearer '+token
  if ((method=='POST' || method=='PUT') && url.indexOf(this.url)===0) h['Content-Type']='application/json; charset=utf-8'
  fetch(url, {method:method, cache:'no-cache', redirect:'error', headers:h, body:data||null}).then(r=>{
    status=r.status;
    if (callback) r.json().then(data=>callback(status, data))
  })
}
crc32(s){
  var makeCRCTable=()=>{
    var k, n, c, z=[]
    for (n=0;n<256;n++) {c=n; for (k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; z[n]=c}
    return z
  }, crcTable=makeCRCTable(), i, crc=0^(-1)
  for (i=0;i<s.length;i++) crc=(crc>>>8)^crcTable[(crc^s.charCodeAt(i))&0xFF]
  crc=((crc^(-1))>>>0).toString(16)
  while (crc.length<8) crc='0'+crc
  return crc
}
}

(chrome||browser).runtime.onMessage.addListener((data, sender)=>{
  const api=new BgAPI(['http://localhost:88/api/', 'https://money2.org/api/'][1])
  switch(data?.action){
    case 'openOptionsPage':
      api.cb.runtime.openOptionsPage()
      break
/*
    case 'injectContentScriptVK':
      api.cb.tabs.query({url:data.url}).then(tabs=>{
        for (const tab of tabs) api.cb.scripting.executeScript({
          target: {tabId:tab.id},
          args: [window.Reactions],
          func: (r)=>{alert(r)}
        })
      })
      break;
*/
    case 'addLike':
    case 'removeLike':
    case 'addCommentLike':
    case 'removeCommentLike':
      api.remoteRequest('POST', null, '{"action":"'+data.action.replace('C', '_c').replace('L', '_l')+'", "process":'+data.process+', "url32":"'+api.crc32(data.url)+'", "count":'+data.count+', "url":"'+data.url+'"}', (status, resp)=>{
        api.cb.tabs.sendMessage(sender.tab.id, {process:resp.data && resp.data.process?resp.data.process:data.process, status:status, response:resp})
      })
      break
    case 'getLikes':
    case 'getCommentLikes':
      let n, url, urls32={}
      for (url of data.urls) urls32[api.crc32(url)]=url
      api.remoteRequest('GET', null, 'action='+(data.action=='getLikes'?'':'comment_')+'likes&urls32='+Object.keys(urls32).join(','), (status, resp)=>{
        if (resp?.result=='success') {
          resp.data.urls={}
          for (n in resp.data.urls32) resp.data.urls[urls32[n]]=n
        }
        api.cb.tabs.sendMessage(sender.tab.id, {status:status, response:resp})
      })
      break
  }
})
