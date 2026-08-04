/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// Distance (px) the user must scroll before the button reveals itself.
const SCROLL_THRESHOLD = 400;

// The doc pages scroll inside `.home-Wrapper`, not the window. Fall back to the
// document scroller so the button still works if that container is absent.
function getScrollContainer() {
  return document.querySelector('.home-Wrapper') || document.scrollingElement || document.documentElement;
}

function createButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'back-to-top';
  button.setAttribute('aria-label', 'Back to top');
  button.setAttribute('title', 'Back to top');
  button.innerHTML = '<svg class="back-to-top-icon" viewBox="0 0 36 36" focusable="false" aria-hidden="true">' + '<path d="M18 10.8 27.9 20.7 25.2 23.4 18 16.2 10.8 23.4 8.1 20.7Z" />' + '</svg>';
  return button;
}

/**
 * Mounts a floating "back to top" button that appears once the user scrolls
 * past SCROLL_THRESHOLD and smoothly returns them to the top on activation.
 * Safe to call on any page; it no-ops when no scroll container exists.
 */
export function initBackToTop() {
  const container = getScrollContainer();
  if (!container) return;

  const isWindowScroller = container === document.scrollingElement || container === document.documentElement;
  const scrollSource = isWindowScroller ? window : container;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const button = createButton();
  (document.getElementById('page') || document.body).appendChild(button);

  const currentScrollTop = () => (isWindowScroller ? window.scrollY || document.documentElement.scrollTop : container.scrollTop);

  const updateVisibility = () => {
    button.classList.toggle('is-visible', currentScrollTop() > SCROLL_THRESHOLD);
  };

  button.addEventListener('click', () => {
    const behavior = reducedMotion.matches ? 'auto' : 'smooth';
    scrollSource.scrollTo({top: 0, behavior});
  });

  scrollSource.addEventListener('scroll', updateVisibility, {passive: true});
  window.addEventListener('resize', updateVisibility, {passive: true});
  updateVisibility();
}
