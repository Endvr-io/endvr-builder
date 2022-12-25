export interface dataType {
  assets: string
  components: string
  css: string
  html: string
  styles: string
}

export interface StaticBuildProps {
  data?: dataType
  updateData?: any
}

export interface ContentProviderProps extends StaticBuildProps {
  showEditorInProd: boolean
  standaloneServer: boolean
}
