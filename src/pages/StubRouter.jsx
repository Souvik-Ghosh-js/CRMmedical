import { useLocation } from 'react-router-dom'
import { NAV } from '../nav'
import { ModuleStub } from '../components/ui'

export default function StubRouter() {
  const { pathname } = useLocation()
  const item = NAV.flatMap((s) => s.items).find((i) => i.to === pathname)

  if (!item) {
    return <ModuleStub title="Page not found" subtitle={pathname} features={['Use the sidebar to navigate to a module.']} />
  }

  return (
    <ModuleStub
      title={item.label}
      subtitle="Industry-standard scope for this module"
      features={item.features || ['Module scaffolded — detailed screens coming in a future iteration.']}
      note="Core masters, inventory, GST billing, purchase, accounting and reports are fully functional. This module is wired into navigation with its standard feature scope and will be built out next."
    />
  )
}
