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

function pageLoader() {
  const loader = document.getElementById('pageLoader');
  const page = document.getElementById('page');
  const transitionMs = 200;

  if (page) {
    page.style.transition = `opacity ${transitionMs}ms ease-out`;
    // Commit the starting opacity before transitioning to 1.
    void page.offsetWidth;
    page.style.opacity = '1';
  }

  if (loader) {
    loader.style.transition = `opacity ${transitionMs}ms ease-out`;
    void loader.offsetWidth;
    loader.style.opacity = '0';
  }

  // Finish reveal even if the opacity transition never advances (throttled tabs).
  setTimeout(() => {
    if (page) {
      page.style.transition = 'none';
      page.style.opacity = '1';
    }
    loader?.remove();
  }, transitionMs + 50);
}

/** Reveal the page after modules load, even if `window` `load` already fired. */
function schedulePageLoader() {
  if (document.readyState === 'complete') {
    pageLoader();
  } else {
    window.addEventListener('load', pageLoader, {once: true});
  }
}

export {pageLoader, schedulePageLoader};
