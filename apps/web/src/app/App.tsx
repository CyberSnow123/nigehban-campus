import { useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'

import { Providers } from './providers'
import { routes } from './router'

export default function App() {
  const [router] = useState(() => createBrowserRouter(routes))
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
