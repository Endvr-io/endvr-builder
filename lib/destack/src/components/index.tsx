import React, { FC, useEffect, useState, useRef } from 'react'
import { ContentProviderProps } from '../../types'
import { ToastContainer } from './toast'

import devStyles from '../css/dev.module.css'
import prodStyles from '../css/prod.module.css'

import { tailwindCssUrl } from '../../server/config'

const ContentProvider: FC<ContentProviderProps> = ({
  data,
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

    if (showEditor) {
      import('./initEditor').then((c) => c.initEditor(startServer, standaloneServer))
    } else {
      if (data) {
        setCss(data.css)
        setHtml(data.html)
      }
    }

    mounted.current = true
  }, [])

  if (showEditor)
    return (
      <div style={{ height: '100%', margin: '0 auto', width: '100%' }}>
        <style>{devStyles}</style>
        <div id="gjs"></div>
      </div>
    )
  else
    return (
      <>
        <link rel="stylesheet" onLoad={() => setTailwindLoaded(true)} href={tailwindCssUrl} />
        <style>{prodStyles}</style>
        <style> {css}</style>
        {(!standaloneServer || tailwindLoaded) && (
          <div dangerouslySetInnerHTML={{ __html: html ?? '' }}></div>
        )}
        <ToastContainer />
      </>
    )
}
export { ContentProvider }
