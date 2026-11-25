import { describe, it, expect, vi } from 'vitest'
import { installExternalLinkGuard, isExternalUrl } from '../src/main/externalLinks'

function fakeWebContents(current = 'file:///app/index.html') {
  let openHandler: ((d: { url: string }) => { action: string }) | undefined
  let navigate: ((e: { preventDefault: () => void }, url: string) => void) | undefined
  const wc = {
    setWindowOpenHandler: (h: typeof openHandler) => { openHandler = h },
    on: (ev: string, h: typeof navigate) => { if (ev === 'will-navigate') navigate = h },
    getURL: () => current
  }
  return { wc, open: (url: string) => openHandler!({ url }), nav: (url: string) => {
    const e = { preventDefault: vi.fn() }
    navigate!(e, url)
    return e
  } }
}

describe('externalLinks', () => {
  it('reconnaît http(s) et mailto uniquement', () => {
    expect(isExternalUrl('https://a.b/c')).toBe(true)
    expect(isExternalUrl('HTTP://a.b')).toBe(true)
    expect(isExternalUrl('mailto:x@y.z')).toBe(true)
    expect(isExternalUrl('file:///c:/x')).toBe(false)
    expect(isExternalUrl('javascript:alert(1)')).toBe(false)
  })

  it('window.open : ouvre dans le navigateur et refuse la fenêtre Electron', () => {
    const f = fakeWebContents()
    const openExternal = vi.fn()
    installExternalLinkGuard(f.wc as never, openExternal)
    expect(f.open('https://build-dmd-iis.domain.local/diamonds/')).toEqual({ action: 'deny' })
    expect(openExternal).toHaveBeenCalledWith('https://build-dmd-iis.domain.local/diamonds/')
  })

  it('window.open non externe : refusé sans ouverture', () => {
    const f = fakeWebContents()
    const openExternal = vi.fn()
    installExternalLinkGuard(f.wc as never, openExternal)
    expect(f.open('file:///etc/passwd')).toEqual({ action: 'deny' })
    expect(openExternal).not.toHaveBeenCalled()
  })

  it('navigation externe : bloquée et redirigée vers le navigateur', () => {
    const f = fakeWebContents()
    const openExternal = vi.fn()
    installExternalLinkGuard(f.wc as never, openExternal)
    const e = f.nav('https://example.com')
    expect(e.preventDefault).toHaveBeenCalled()
    expect(openExternal).toHaveBeenCalledWith('https://example.com')
  })

  it('rechargement de la page courante : laissé passer', () => {
    const f = fakeWebContents('http://localhost:5173/')
    const openExternal = vi.fn()
    installExternalLinkGuard(f.wc as never, openExternal)
    const e = f.nav('http://localhost:5173/')
    expect(e.preventDefault).not.toHaveBeenCalled()
    expect(openExternal).not.toHaveBeenCalled()
  })
})
