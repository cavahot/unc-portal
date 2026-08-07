// Accessibility preferences initialization — runs before React hydration
// Reads saved preferences from localStorage and applies CSS classes to <html>
try {
  var s = JSON.parse(localStorage.getItem('unc-a11y') || '{}')
  var h = document.documentElement
  var c = h.classList
  if (s.grayscale)      c.add('a11y-grayscale')
  if (s.highContrast)   c.add('a11y-high-contrast')
  if (s.negative)       c.add('a11y-negative')
  if (s.lightBg)        c.add('a11y-light-bg')
  if (s.underlineLinks) c.add('a11y-underline-links')
  if (s.readableFont)   c.add('a11y-readable-font')
  if (s.fontSize && s.fontSize !== 100) h.style.fontSize = s.fontSize + '%'
} catch (e) {}
