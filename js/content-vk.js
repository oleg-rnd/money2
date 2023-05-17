// (c) 2023, alibrt <pubcube@pm.me>

class VK {

constructor(options){
  var t=this
  t.options=options||{}
  t.reToken=/^[\da-z]{32}$/
  t.inputHTML='<input type=hidden name=url value=~><input type=number size=3 name=# value=1 min=1 style="width:55px;font-size:.9em">'
  t.cb=chrome||browser
  t.storage=t.cb.storage.local
  t.mode='' // open || hidden
  t.cb.storage.onChanged.addListener((changes, area)=>{
    var n, p
    if (area!='local') return
    if ((p=changes.settings)) {
      for (n of ['mode_hidden_enabled', 'comment_like_enabled']) if ((p.oldValue && !!p.oldValue['settings['+n+']'])!=(p.newValue && !!p.newValue['settings['+n+']'])) {
        location.reload()
        return
      }
    }
  })
  t.cb.runtime.onMessage.addListener((data, sender)=>{
    var a
    if (data.status!=200 || data.response.result!='success') return
    switch((a=data.response.data.action)){
      case 'add_like':
      case 'remove_like':
      case 'add_comment_like':
      case 'remove_comment_like':
        let button=document.querySelector('div[data-like-process="'+data.response.data.process+'"]')
        if (button) {
          button.removeAttribute('data-like-process')
          button.setAttribute('data-likes-count-my', Number(button.getAttribute('data-likes-count-my')||0)+data.response.data.count*(a.includes('add')?1:-1))
          if (t.mode=='hidden') return
          button.lastChild.innerText=Number(button.lastChild.innerText)+data.response.data.count*(a.includes('add')?1:-1)
          button.classList[Number(button.getAttribute('data-likes-count-my'))>0?'add':'remove']('PostButtonReactions--active')
//          button.click()
        }
        break
      case 'likes':
      case 'comment_likes':
        document.querySelectorAll('div'+(a=='likes'?':not(.reply_footer)':'.reply_footer')+' > div > div > .like_btns[data-processed="1"]').forEach(div=>{
          var url=t.prepareURL(a=='likes'?(div.closest('._post_content')?.querySelector('a.PostHeaderSubtitle__link')?.href||location.href):(div.closest('.reply_footer').querySelector('a.wd_lnk')?.href||location.href)), url32, button, c
          url32=url && data.response.data.urls?data.response.data?.urls[url]:null
          div.setAttribute('data-processed', 2)
          if (!url || !url32 || !data.response.data.urls32 || !data.response.data.urls32[url32]) return
          button=div.querySelector('[data-likes-count-my]')
          button.setAttribute('data-likes-count-my', (c=data.response.data.urls32[url32][1]))
          if (t.mode=='hidden') return
          if (c) button.classList.add('PostButtonReactions--active')
          button.lastChild.innerText=data.response.data.urls32[url32][0]
        })
        break
    }
  })
}
prepareURL(url){
  return url.split('?')[0]+((url=url.match(/(reply=\d+)/))?'?'+url[1]:'')
}
isAuth(){
//  document.cookie.includes('osnova-remember') // not accessable, because HTTPOnly cookie
  return !!document.querySelector('#top_profile_link')
}
async onMutation(mutations, observer){
  var t=this, urls, storage={}, err
  try {
    if (t.storage) storage=await t.storage.get(['token', 'settings'])
  } catch(err) {
  }
  mutations.forEach(mutation=>{
    if (mutation.type=='childList') [...mutation.addedNodes].forEach(node=>{
      if (node.localName=='div') {
        urls={likes:[], commentLikes:[]}
        document.querySelectorAll('div.like_btns:not([data-processed])').forEach(div=>{
          var item=document.createElement('div'), button=t.mode=='open'?document.createElement('div'):div.querySelector('.PostButtonReactionsContainer'), isComment=!!div.closest('.reply_footer')
          if(isComment && (storage.token&&!storage.settings['settings[comment_like_enabled]'] || !div.closest('.reply_footer')?.querySelector('.reply_date a.wd_lnk'))) return
          div.setAttribute('data-processed', 1)
          urls[isComment?'commentLikes':'likes'].push(t.prepareURL(isComment?(div.closest('.reply_footer').querySelector('a.wd_lnk')?.href||location.href):(div.closest('._post_content').querySelector('a.PostHeaderSubtitle__link')?.href||location.href)))
          button.setAttribute('data-likes-count-my', 0)
          if (t.mode=='hidden') return
          button.className='PostBottomAction PostBottomAction--withBg PostButtonReactions--post'
          button.role='button'
          button.style='--reaction-button-title-color-light:#FF3347; --reaction-button-title-color-dark:#FF5C5C; --reaction-button-background-color-light:#FFEDED; --reaction-button-background-color-dark:#3E2526;'
          button.innerHTML='<span class="PostBottomAction__icon _like_button_icon PostButtonReactions__title"><b>+</b></span>\
                            <span class="PostBottomAction__label _like_button_label PostBottomAction__label--withBg"></span>\
                            <span class="PostBottomAction__count _like_button_count PostBottomAction__count--withBg PostButtonReactions__title">0</span>'
          button.onclick=function(e){
            var a=Number(this.getAttribute('data-likes-count-my'))>0?'add':'remove'
            this.classList[a]('PostButtonReactions--active')
          }
          item.className='PostBottomActionContainer PostButtonReactionsContainer _like_btn'
          item.style.marginLeft='8px'
          item.appendChild(button)
          if (isComment) div.appendChild(item)
          else div.appendChild(item)
        })
        if (urls.likes.length) t.cb.runtime.sendMessage({action:'getLikes', urls:urls.likes})
        if (urls.commentLikes.length) t.cb.runtime.sendMessage({action:'getCommentLikes', urls:urls.commentLikes})
      }
//    observer.disconnect()
    })
  })
}
promptInit(){
  this.showModalPrompt='Сгенерировать код восстановления,<br>чтобы отправлять деньги вместе с лайком?<input type=hidden name=private_key value=1>'
}
promptAddLike(url, count, isAutoLike){
  this['showModal'+(isAutoLike?'Alert':'Prompt')]=isAutoLike?'Засчитали!':'Отправляете '+this.inputHTML.replace('~', url).replace('#', 'addLike max=99'+(this.mode=='open'?'':' readonly'))+' m2-лайк?'
}
promptRemoveLike(url, count){
  this.showModalPrompt='Отзываете '+this.inputHTML.replace('~', url).replace('#', 'removeLike max='+count+(this.mode=='open'?'':' readonly'))+' m2-лайк?'
}
promptAddCommentLike(url, count, isAutoLike){
  this['showModal'+(isAutoLike?'Alert':'Prompt')]=isAutoLike?'Коммент-лайк засчитан!':'Отправляете '+this.inputHTML.replace('~', url).replace('#', 'addCommentLike max=99'+(this.mode=='open'?'':' readonly'))+' коммент-лайк?'
}
promptRemoveCommentLike(url, count){
  this.showModalPrompt='Отзываете '+this.inputHTML.replace('~', url).replace('#', 'removeCommentLike max='+count+(this.mode=='open'?'':' readonly'))+' коммент-лайк?'
}
set showModalPrompt(html){
  var div=document.createElement('div'), form=document.createElement('form')
  div.style='position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;background-color:rgba(0,0,0,.75)'
  form.style='display:block;position:absolute;z-index:1001;top:30%;left:50%;margin-left:-150px;padding:15px;text-align:center;border:1px solid #333;border-radius:8px;box-shadow:8px 8px 10px #111;background-color:#fff'
  form.method='post'
  form.innerHTML='<h2 style="margin-bottom:15px;font-size:1.5em">'+html+'</h2><button type="submit" style="padding:5px 30px;border:1px solid #ccc;border-radius:3px;cursor:pointer">Да</button> &nbsp; <button type="button" style="padding:5px 30px;border:1px solid #ccc;border-radius:3px;cursor:pointer">Нет</button>'
  form.lastChild.onclick=function(e){document.body.removeChild(this.parentNode.parentNode)}
  div.appendChild(form)
  document.body.appendChild(div)
}
set showModalAlert(html){
  var div=[document.createElement('div'), document.createElement('div')]
  div[0].style='position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;background-color:rgba(0,0,0,.75)'
  div[1].style='display:block;position:absolute;z-index:1001;top:30%;left:50%;margin-left:-150px;padding:15px;text-align:center;border:1px solid #333;border-radius:8px;box-shadow:8px 8px 10px #111;background-color:#fff'
  div[1].innerHTML='<h2 style="margin-bottom:15px;font-size:1.5em">'+html+'</h2>'
  div[0].appendChild(div[1])
  document.body.appendChild(div[0])
  setTimeout(()=>document.body.removeChild(div[0]), this.options.alertDelay)
}
}

!async function(options){
  const vk=new VK(options)
  var likeProcess=0
  vk.mode=(await vk.storage.get('settings')).settings
  vk.mode=vk.mode && vk.mode['settings[mode_hidden_enabled]']?'hidden':'open'
  ;(new MutationObserver(vk.onMutation.bind(vk))).observe(document, {attributes:false, attributeOldValue:false, childList:true, subtree:true, characterData:false, characterDataOldValue:false})
  document.body.addEventListener('click', async e=>{
    var el=e.target.closest('div'), isActive, storage, w
    if (!(el=el.closest('.PostButtonReactionsContainer')?.firstElementChild) || el.getAttribute('data-likes-count-my')===null) return
//    e.stopPropagation()
    isActive=el.getAttribute('data-likes-count-my')>0 // el.className.includes('PostButtonReactions--active')
    try {
      storage=await vk.storage.get(['token', 'properties', 'settings'])
    } catch(w) {
//      e.target.dispatchEvent(new Event('click'))
      return
    }
//    if (vk.mode=='open' && !el.parentNode.previousElementSibling) {el.dispatchEvent(new Event('click')); return}
    if (vk.reToken.test(storage.token)) {
      if (!vk.isAuth() && vk.mode=='hidden') {/*e.target.dispatchEvent(new Event('click'));*/ return}
      if (!(url=el.closest('div.reply_footer')?.querySelector('a.wd_lnk')?.href||el.closest('div._post_content')?.querySelector('a.PostHeaderSubtitle__link')?.href||location.href)) return
      url=vk.prepareURL(url)
      w=!!storage?.settings['settings[auto_like_enabled]']
      if (el.closest('div.reply_footer')) {
        if (storage?.settings['settings[comment_like_enabled]']) {
          vk['prompt'+(isActive?'Remove':'Add')+'CommentLike'](url, el.getAttribute('data-likes-count-my'), w)
          if (!isActive && w) {
            el.setAttribute('data-like-process', ++likeProcess)
            vk.cb.runtime.sendMessage({action:'addCommentLike', url:url, count:1, process:likeProcess})
//            e.target.dispatchEvent(new Event('click'))
          }
        } else {/*e.target.dispatchEvent(new Event('click'));*/ return}
      } else {
        vk['prompt'+(isActive?'Remove':'Add')+'Like'](url, el.getAttribute('data-likes-count-my'), w)
        if (!isActive && w) {
          el.setAttribute('data-like-process', ++likeProcess)
          vk.cb.runtime.sendMessage({action:'addLike', url:url, count:1, process:likeProcess})
//          e.target.dispatchEvent(new Event('click'))
        }
      }
    } else {
//      e.target.dispatchEvent(new Event('click'))
      vk.promptInit()
    }
    document.body.lastChild.firstChild?.addEventListener('submit', function(e){
      var form=this, c=el.className, a, h, i=0
      e.preventDefault()
      if (el.getAttribute('data-like-process')) return
      form.querySelector('button').disabled=true
      if (form.private_key) {
        form.lastChild.click()
        vk.cb.runtime.sendMessage({action:'openOptionsPage'})
        return
      }
//      if (vk.mode=='hidden') e.target.dispatchEvent(new Event('click'))
      el.setAttribute('data-like-process', ++likeProcess)
      new Promise((resolve, reject)=>{
        h=setInterval(function(){
          i++
          if (true || c!=el.className || vk.mode=='open') {
            clearInterval(h)
            resolve(form)
          } else if(i>50) {
            clearInterval(h)
            reject(form)
          }
        }, 75)
      }).then(
        form=>{
          var input=form.querySelector('input[type=number]')
          if (Number(input.value)>0) vk.cb.runtime.sendMessage({action:input.name, url:form.url.value, count:vk.mode=='open'?input.value:1, process:likeProcess})
          form.lastChild.click()
        },
        form=>form.lastChild.click()
      )
    }, false)
  }, true)
}({alertDelay:2E3})
