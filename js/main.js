import {API} from './module/api.js'
import {Events, default as Others} from './module/actions.js'

!async function(options){
  const api=new API(options.test?'http://localhost:88/api/':'https://money2.org/api/')
  var m=location.search.match(/[?&]clear(=[^&]+|=|&|$)/)
  if (m) await api.clearStorage(m[1].substring(1)||'')
  if (!m || m[1].length>1) api.token=(await api.storage.get('token')).token
//  console.log(await api.storage.get())
  if (location.href.includes('/settings.html')) {
    Events.call(api, options)
    Others.call(api, options)
  } else {
    api.storage.get(['properties', 'settings']).then(storage=>{
      document.getElementById('likes').innerText=storage.settings && storage.settings['settings[weight_for_like]']>0?Math.floor((storage.properties.balance||0)/storage.settings['settings[weight_for_like]']):0
    })
    document.querySelector('a[href$="settings.html"]').addEventListener('click', function(e){
      var a=this
      e.preventDefault()
      api.cb.tabs.query({lastFocusedWindow: true}, tabs=>{
        for (var x in tabs) if (tabs[x].url==a.href) {
          api.cb.tabs.update(tabs[x].id, {active: true})
          return
        }
        if (a?.target=='_blank') open(a.href)
        else location.href=a.href
      })
    }, false)
  }
}({autosaveDelay:2E3, test:!1})