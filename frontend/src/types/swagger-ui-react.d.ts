declare module 'swagger-ui-react' {
  import type { ComponentType } from 'react'

  interface SwaggerUIProps {
    url?: string
    spec?: object
    docExpansion?: 'list' | 'full' | 'none'
    defaultModelsExpandDepth?: number
    deepLinking?: boolean
    tryItOutEnabled?: boolean
    [key: string]: unknown
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>
  export default SwaggerUI
}

declare module 'swagger-ui-react/swagger-ui.css'
