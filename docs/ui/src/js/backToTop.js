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

// Distance (px) any scroller must travel before the button reveals itself.
const SCROLL_THRESHOLD = 400;

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
 * Mounts a floating "back to top" button that appears once any relevant scroller
 * passes SCROLL_THRESHOLD and returns the user to the top on activation.
 *
 * Doc pages scroll inside `.home-Wrapper`, but the window/document can scroll too
 * depending on how the user navigates, so both are tracked and reset together.
 * Safe to call on any page.
 */
export function initBackToTop() {
  // Distinct scrollers to watch/reset: the window and the main content container.
  const container = document.querySelector('.home-Wrapper');
  const scrollers = [window];
  if (container) scrollers.push(container);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const button = createButton();
  (document.getElementById('page') || document.body).appendChild(button);

  const scrollTopOf = (scroller) => (scroller === window ? window.scrollY || document.documentElement.scrollTop || 0 : scroller.scrollTop || 0);

  const maxScrollTop = () => scrollers.reduce((max, scroller) => Math.max(max, scrollTopOf(scroller)), 0);

  const updateVisibility = () => {
    button.classList.toggle('is-visible', maxScrollTop() > SCROLL_THRESHOLD);
  };

  button.addEventListener('click', () => {
    const behavior = reducedMotion.matches ? 'auto' : 'smooth';
    scrollers.forEach((scroller) => scroller.scrollTo({top: 0, behavior}));
  });

  scrollers.forEach((scroller) => scroller.addEventListener('scroll', updateVisibility, {passive: true}));
  window.addEventListener('resize', updateVisibility, {passive: true});
  updateVisibility();
}
