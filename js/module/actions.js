export {default as Events} from './events.js'
export default function(options){
  const api=this
  api.modifyStorage().then(b=>b||api.refreshView(!!api.token))
}