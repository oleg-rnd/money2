export default function(options){
  const api=this, d=document
  var hT={},
  onInputPage=input=>{
    input.value=''
    input.classList.remove('is-valid', 'is-invalid')
    input.addEventListener('input', function(){
      this.classList.remove('is-valid', 'is-invalid')
      this.parentNode.parentNode.nextElementSibling.lastChild.disabled=!(new RegExp(this.pattern)).test(this.value.toLowerCase())
    })
    input.addEventListener('keypress', function(e){
      if (e.keyCode==13) this.parentNode.parentNode.nextElementSibling.lastChild.dispatchEvent(new Event('click'))
    })
    if (input.getAttribute('data-autosave')!='false') input.addEventListener('change', saveSettings)
  },
  saveSettings=async function(){
    var form=this.closest('form'), a
    if (!api.token || this.getAttribute('data-autosave')=='false') return
    if (hT[form.name]) {
      clearTimeout(hT[form.name])
      hT[form.name]=null
    }
    await api.storage.set({modifyTime:(new Date).getTime()})
    a=(await api.storage.get('modifyFormName')).modifyFormName || []
    if (!a.includes(form.name)) a.push(form.name)
    await api.storage.set({modifyFormName:a})
    hT[form.name]=setTimeout(()=>{api.modifyStorage(true)}, options.autosaveDelay)
  }

  d.querySelectorAll('form').forEach(form=>{
    form.addEventListener('submit', function(e){
      e.preventDefault()
      return !1
    })
  })
  d.querySelectorAll('form[name=settings], form[name=settings_author]').forEach(form=>{
    form.querySelectorAll('[name^="'+form.name+'"]').forEach(input=>{
      if (input.getAttribute('data-autosave')!='false') input.addEventListener('change', saveSettings)
    })
  })
  d.querySelectorAll('input[type=range]').forEach(input=>{
    new bootstrap.Tooltip(input, {placement:'right', offset:[0, 25], title:input.value})
    input.addEventListener('input', function(){
      bootstrap.Tooltip.getInstance(this).setContent({'.tooltip-inner':this.value})
    })
  })
  d.querySelector('input[name="settings[private_key]"]')?.addEventListener('input', function(){
    this.classList.remove('is-valid', 'is-invalid')
    d.getElementById('btnAccountCreate').disabled=api.token
    d.getElementById('btnAccountRepair').disabled=this.value.length<api.privateKeyMinLength
  })
  d.querySelector('input[name="settings[private_key]"]')?.addEventListener('keypress', function(e){
    if (e.keyCode==13) d.getElementById('btnAccountCreate').dispatchEvent(new Event('click'))
  })
  d.querySelectorAll('input[name$="[page][]"]').forEach(onInputPage)
  d.body.addEventListener('click', e=>{
    var button=e.target, row
    if (button.nodeName!='BUTTON' || !button.parentNode?.parentNode?.querySelector('input[name$="[page][]"]')) return
    if (button.parentNode?.nextElementSibling?.querySelector('input[name$="[page][]"]')) {
      row=button.closest('.row')
      let parent=row.parentNode
      if (button.innerHTML=='+') {
        parent.firstElementChild.firstElementChild.lastElementChild.disabled=false
        if (row.nextElementSibling) {
          parent.insertBefore(row.cloneNode(true), row.nextElementSibling)
          onInputPage(row.nextElementSibling.querySelector('input'))
        } else {
          parent.appendChild(row.cloneNode(true))
          onInputPage(row.parentNode.lastChild.querySelector('input'))
        }
      } else if (row.parentNode.querySelectorAll('.row').length>1) {
        saveSettings.call(button)
        parent.removeChild(row)
        if (parent.firstElementChild===parent.lastElementChild) parent.firstElementChild.firstElementChild.lastElementChild.disabled=true
      }
    }
    else if (button.parentNode?.previousElementSibling?.querySelector('input[name$="[page][]"]')) api.checkPublicKey(e)
  }, true)
  d.getElementById('btnAccountCreate')?.addEventListener('click', api.createAccount.bind(api))
  d.getElementById('btnAccountRepair')?.addEventListener('click', api.repairAccount.bind(api))
  d.getElementById('btnDeposit')?.addEventListener('click', api.deposit.bind(api))
  window.addEventListener('DOMContentLoaded', api.refreshStorage.bind(api))
}