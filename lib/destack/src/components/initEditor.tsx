import { loadPanels } from '../lib/panels'
import { loadTraits } from '../lib/traits'
import { loadComponents } from '../lib/components'
import { loadBlocks } from '../lib/blocks'
import { fetchJSON, escapeName } from '../utils'
import { appendCss } from '../lib/css'
import { handleEvents } from '../lib/events'
const grapesJsTouch = require('grapesjs-touch')

import { ChangeEvent } from 'react'
import { standaloneServerPort as port } from '../../server/config'

function resizableAllPlugin(editor, options = {}) {
  const resizableOptions = {
    tl: true,
    tc: true,
    tr: true,
    cl: true,
    cr: true,
    bl: true,
    bc: true,
    br: true,
  }

  // Listen for the 'component:add' event
  editor.on('component:add', (component) => {
    // Set the resizable property for the added component
    component.set('resizable', resizableOptions)
  })
}

const uploadFile = (e, editor, standaloneServer): void => {
  const files = e.dataTransfer ? e.dataTransfer.files : e.target.files
  const formData = new FormData()
  for (const i in files) {
    formData.append('file-' + i, files[i])
  }

  const baseUrl = standaloneServer ? `http://localhost:${port}` : ''
  fetch(`${baseUrl}/api/builder/handle`, { method: 'POST', body: formData })
    .then((res) => res.json())
    .then((images) => {
      editor.AssetManager.add(images)
    })
}

const initEditor = async (
  startServer = true,
  standaloneServer,
  data,
  updatePage,
): Promise<void> => {
  const grapesjs = await import('grapesjs')

  // for 'npm run test' only
  globalThis.grapesjs = grapesjs

  if (startServer) {
    assetManagerOptions.uploadFile = (e: ChangeEvent<HTMLInputElement>) =>
      uploadFile(e, editor, standaloneServer)
    editorOptions.assetManager = assetManagerOptions
  }

  // need var intead of const so it's global
  // and its accessible in uploadFile function
  var editor = grapesjs.init(editorOptions)

  loadTraits(editor)
  loadPanels(editor, startServer)
  loadComponents(editor)
  loadBlocks(editor)

  appendCss(editor)

  if (startServer) handleEvents(editor, standaloneServer, updatePage)
  if (startServer) loadTemplate(editor, standaloneServer, data)
}

const loadTemplate = async (editor, standaloneServer, data): Promise<void> => {
  editor.setComponents(JSON.parse(data.components))
  editor.setStyle(JSON.parse(data.styles))
}

const assetManagerOptions = {
  storageType: '',
  storeOnChange: true,
  storeAfterUpload: true,
  assets: [],
  uploadFile,
}

const editorOptions = {
  selectorManager: { escapeName },
  container: '#gjs',
  height: '100%',
  width: '100%',
  storageManager: { autoload: false },
  showDevices: false,
  traitsEditor: true,
  assetManager: assetManagerOptions,
  plugins: [resizableAllPlugin, grapesJsTouch],
}
export { initEditor }
