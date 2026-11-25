import type { WebContents } from 'electron'

const EXTERNAL_RE = /^(https?:|mailto:)/i

export function isExternalUrl(url: string): boolean {
  return EXTERNAL_RE.test(url)
}

type LinkWebContents = Pick<WebContents, 'setWindowOpenHandler' | 'on' | 'getURL'>

// Aucune URL externe ne doit ouvrir de fenêtre Electron : on la confie au navigateur par défaut.
export function installExternalLinkGuard(wc: LinkWebContents, openExternal: (url: string) => void): void {
  wc.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) openExternal(url)
    return { action: 'deny' }
  })
  wc.on('will-navigate', (e, url) => {
    if (url === wc.getURL()) return
    if (isExternalUrl(url)) {
      e.preventDefault()
      openExternal(url)
    }
  })
}
