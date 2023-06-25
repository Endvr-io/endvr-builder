import { loadPanels } from '../lib/panels'
import { loadTraits } from '../lib/traits'
import { loadComponents } from '../lib/components'
import { loadBlocks } from '../lib/blocks'
import { fetchJSON, escapeName } from '../utils'
import { appendCss } from '../lib/css'
import { handleEvents } from '../lib/events'

import { ChangeEvent } from 'react'
import { standaloneServerPort as port } from '../../server/config'
import { sources } from '../lib/blocks/tailwind'

function loadTailwindComponents(newEditor) {
  sources.forEach((s) => {
    newEditor.DomComponents.addType(s.id, {
      model: {
        defaults: {
          // These are the default properties of your component,
          // you should replace this with the properties that fit your component
          tagName: 'div',
          attributes: { class: s.class },
          components: s.content,
        },
      },
    })
  })
}

function loadTailwindBlocks(newEditor) {
  loadTailwindComponents(newEditor) // Call the function to load components here before loading blocks

  const blockManager = newEditor.BlockManager

  sources.forEach((s) => {
    blockManager.add(s.id, {
      label: s.label,
      attributes: { class: s.class },
      content: {
        type: s.id, // Use the component type you've defined
      },
      category: { label: s.category, open: s.category === 'Blog' },
    })
  })
}

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

  const setResizable = (component) => {
    component.set('resizable', resizableOptions)
    const components = component.components()
    if (components.length > 0) {
      components.each((component) => setResizable(component))
    }
  }

  editor.on('load', () => {
    editor.DomComponents.getComponents().each((component) => {
      setResizable(component)
    })
  })

  editor.on('component:add', (component) => {
    setResizable(component)
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
  const grapesjsTouch = await import('grapesjs-touch')

  // for 'npm run test' only
  globalThis.grapesjs = grapesjs

  if (startServer) {
    assetManagerOptions.uploadFile = (e: ChangeEvent<HTMLInputElement>) =>
      uploadFile(e, editor, standaloneServer)
    editorOptions.assetManager = assetManagerOptions
  }

  // need var intead of const so it's global
  // and its accessible in uploadFile function
  var editor = grapesjs.init({
    ...editorOptions,
    plugins: [grapesjsTouch.default, loadTailwindBlocks, resizableAllPlugin],
  })

  loadTraits(editor)
  loadPanels(editor, startServer)
  loadComponents(editor)
  loadBlocks(editor)

  if (startServer) handleEvents(editor, standaloneServer, updatePage)
  if (startServer) loadTemplate(editor, standaloneServer, data)

  appendCss(editor)
}

const loadTemplate = async (editor, standaloneServer, data): Promise<void> => {
  editor.loadProjectData(data)
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
}
export { initEditor }
