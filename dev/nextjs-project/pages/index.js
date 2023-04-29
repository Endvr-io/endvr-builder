require('./styles/index.module.css')
export { getStaticProps } from 'endvr-builder/build/server'
import { ContentProvider } from 'endvr-builder'

const Index = (props) => {
  return (
    <div style={{ height: '100%' }}>
      <ContentProvider {...props} />
    </div>
  )
}
export default Index
