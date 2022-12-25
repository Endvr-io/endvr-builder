import React, { FC, useEffect, useState, useRef } from 'react'
import { ContentProviderProps } from '../../types'
import { ToastContainer } from './toast'

import devStyles from '../css/dev.module.css'
import prodStyles from '../css/prod.module.css'

import { tailwindCssUrl } from '../../server/config'
import { initEditor } from './initEditor'

const ContentProvider: FC<ContentProviderProps> = ({
  data,
  handlePageUpdate,
  showEditorInProd = false,
  standaloneServer = false,
}) => {
  const mounted = useRef<boolean>(false)
  const [css, setCss] = useState<string | undefined>()
  const [html, setHtml] = useState<string | undefined>()

  const isDev = !data
  const showEditor = isDev || showEditorInProd
  const startServer = isDev && !showEditorInProd

  const [tailwindLoaded, setTailwindLoaded] = useState<boolean>(false)

  useEffect(() => {
    if (mounted.current) return

    import('./initEditor').then((c) => c.initEditor(true, true, data, handlePageUpdate))

    mounted.current = true
  }, [])

  return (
    <div style={{ height: '100%', margin: '0 auto', width: '100%' }}>
      <style>{devStyles}</style>
      <div id="gjs"></div>
    </div>
  )
  // else
  //   return (
  //     <>
  //       <link rel="stylesheet" onLoad={() => setTailwindLoaded(true)} href={tailwindCssUrl} />
  //       <style>{prodStyles}</style>
  //       <style> {css}</style>
  //       {(!standaloneServer || tailwindLoaded) && (
  //         <div dangerouslySetInnerHTML={{ __html: html ?? '' }}></div>
  //       )}
  //       <ToastContainer />
  //     </>
  //   )
}
export { ContentProvider }
