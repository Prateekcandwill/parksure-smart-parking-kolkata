import { useEffect } from 'react'
import { DEMO_CONFIG } from '@/config/env'

export interface PageMetaProps {
  title: string
  description: string
  path: string
  noindex?: boolean
  image?: string
  type?: 'website' | 'article'
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

/**
 * Keeps the document title, description, canonical URL and social tags in sync
 * with the current route. Search crawlers that execute JavaScript see the same
 * metadata a visitor sees; the static tags in index.html cover the rest.
 */
export function PageMeta({ title, description, path, noindex = false, image, type = 'website' }: PageMetaProps) {
  useEffect(() => {
    const url = `${DEMO_CONFIG.siteUrl}${path}`
    const socialImage = image ?? `${DEMO_CONFIG.siteUrl}/og-image.jpg`

    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:site_name', 'ParkSure')
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:image', socialImage)
    upsertMeta('property', 'og:image:alt', 'ParkSure — Park without the wait')
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', socialImage)

    if (noindex) {
      const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      canonical?.remove()
    } else {
      upsertLink('canonical', url)
    }
  }, [title, description, path, noindex, image, type])

  return null
}
