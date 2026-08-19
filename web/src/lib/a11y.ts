/**
 * Shared behaviour for the overlay primitives: focus containment, Escape and
 * outside-click dismissal, and scroll locking. Written once here so Dialog,
 * Drawer, Popover and DropdownMenu cannot drift apart.
 */

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element.getClientRects().length > 0,
  )
}

/**
 * Holds keyboard focus inside `container` while `active`, and returns it to
 * whatever was focused beforehand on close.
 */
export function useFocusTrap(container: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return
    const node = container.current
    if (!node) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const initial = focusableWithin(node)[0] ?? node
    // A container without focusable children still needs to receive focus.
    if (initial === node && !node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1')
    initial.focus({ preventScroll: true })

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !node) return
      const items = focusableWithin(node)
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]!
      const last = items[items.length - 1]!
      const current = document.activeElement

      if (event.shiftKey && (current === first || current === node)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [container, active])
}

/** Escape key and pointer-outside dismissal for a floating surface. */
export function useDismiss(
  container: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void,
  options: { ignore?: RefObject<HTMLElement | null> } = {},
): void {
  const handler = useRef(onDismiss)
  handler.current = onDismiss
  const ignore = options.ignore

  useEffect(() => {
    if (!active) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        handler.current()
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (!target) return
      if (container.current?.contains(target)) return
      if (ignore?.current?.contains(target)) return
      handler.current()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [container, active, ignore])
}

/** Prevents the page behind a modal surface from scrolling. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const { overflow, paddingRight } = document.body.style
    const gap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [active])
}
