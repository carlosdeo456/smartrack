/**
 * Accessibility utility functions for WCAG 2.1 AA compliance
 */

/**
 * Calculate contrast ratio between two colors (hex format)
 * Returns ratio (e.g., 4.5:1 = 4.5)
 */
export const getContrastRatio = (foreground, background) => {
  const getLuminance = (hex) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    
    const [rs, gs, bs] = [r, g, b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if contrast ratio meets WCAG AA standards
 * normalText: 4.5:1 or higher
 * largeText: 3:1 or higher
 */
export const isContrastCompliant = (ratio, isLargeText = false) => {
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Keyboard event helpers
 */
export const KEYS = {
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  SPACE: ' ',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
};

/**
 * Check if key event is enter
 */
export const isEnterKey = (e) => e.key === KEYS.ENTER || e.keyCode === 13;

/**
 * Check if key event is escape
 */
export const isEscapeKey = (e) => e.key === KEYS.ESCAPE || e.keyCode === 27;

/**
 * Check if key event is space
 */
export const isSpaceKey = (e) => e.key === KEYS.SPACE || e.keyCode === 32;

/**
 * Check if key event is arrow key
 */
export const isArrowKey = (e) => ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);

/**
 * ARIA role validation
 */
export const VALID_ROLES = [
  'button', 'link', 'tab', 'menuitem', 'checkbox', 'radio',
  'img', 'region', 'heading', 'main', 'navigation', 'article',
  'search', 'complementary', 'contentinfo', 'banner',
];

/**
 * Generate unique ID for form labels and ARIA references
 */
export const generateId = (prefix = 'id') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create ARIA label from attribute combinations
 */
export const createAriaLabel = (primary, secondary) => {
  if (primary && secondary) {
    return `${primary}. ${secondary}`;
  }
  return primary || secondary || '';
};

/**
 * Get readable text from React children
 */
export const getTextContent = (children) => {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children
      .map(child => getTextContent(child))
      .filter(Boolean)
      .join(' ');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return getTextContent(children.props.children);
  }
  return '';
};

/**
 * Check if element is keyboard accessible
 */
export const isKeyboardAccessible = (element) => {
  const interactiveElements = ['button', 'a', 'input', 'select', 'textarea'];
  const tagName = element?.tagName?.toLowerCase();
  const hasTabIndex = element?.getAttribute('tabindex');
  const hasRole = element?.getAttribute('role');
  
  return interactiveElements.includes(tagName) || 
         (hasTabIndex && parseInt(hasTabIndex) >= 0) ||
         (hasRole && VALID_ROLES.includes(hasRole));
};

/**
 * Focus management utilities
 */
export const focusElement = (element) => {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
};

export const focusFirstElement = (container) => {
  const focusable = container?.querySelector(
    'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable) focusElement(focusable);
};

/**
 * Live region announcement for screen readers
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    announcement.remove();
  }, 1000);
};

/**
 * Trap focus within modal/dialog
 */
export const createFocusTrap = (container) => {
  if (!container) return null;
  
  const getFocusableElements = () => {
    return Array.from(
      container.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
  };
  
  const handleKeyDown = (e) => {
    if (e.key !== KEYS.TAB) return;
    
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;
    
    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];
    const activeElement = document.activeElement;
    
    if (e.shiftKey) {
      if (activeElement === firstElement) {
        e.preventDefault();
        focusElement(lastElement);
      }
    } else {
      if (activeElement === lastElement) {
        e.preventDefault();
        focusElement(firstElement);
      }
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Accessibility compliance checklist
 */
export const a11yChecklist = {
  structure: [
    '✓ Semantic HTML elements used (button, main, nav, etc.)',
    '✓ Proper heading hierarchy (h1 > h2 > h3)',
    '✓ Skip navigation link present',
    '✓ Landmarks defined (main, nav, complementary)',
  ],
  keyboard: [
    '✓ All interactive elements keyboard accessible',
    '✓ Tab order logical and visible',
    '✓ Focus indicators visible and clear',
    '✓ Escape key closes modals/menus',
  ],
  labels: [
    '✓ Form inputs have associated labels',
    '✓ ARIA labels for icon-only buttons',
    '✓ Image alt text provided',
    '✓ Complex elements have aria-label or aria-describedby',
  ],
  contrast: [
    '✓ Normal text: 4.5:1 contrast ratio',
    '✓ Large text: 3:1 contrast ratio',
    '✓ UI components: 3:1 contrast ratio',
  ],
  screenReader: [
    '✓ Dynamically announced changes with aria-live',
    '✓ Status messages conveyed to assistive tech',
    '✓ Hidden from view but available to screen readers (sr-only)',
  ],
};

export default {
  getContrastRatio,
  isContrastCompliant,
  isEnterKey,
  isEscapeKey,
  isSpaceKey,
  isArrowKey,
  generateId,
  createAriaLabel,
  getTextContent,
  isKeyboardAccessible,
  focusElement,
  focusFirstElement,
  announceToScreenReader,
  createFocusTrap,
  a11yChecklist,
  KEYS,
};
