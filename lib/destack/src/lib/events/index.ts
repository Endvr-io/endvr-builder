import { fetchJSON } from '../../utils'

import { standaloneServerPort as port } from '../../../server/config'

const handleEvents = (newEditor, standaloneServer, pageUpdate): void => {
  newEditor.on('storage:store', (e) => {
    const template = { html: newEditor.getHtml(), css: newEditor.getCss() }
    pageUpdate({ ...e, template })
  })
}
export { handleEvents }
