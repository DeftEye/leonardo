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

import '@spectrum-css/vars/dist/spectrum-global.css';
import '@spectrum-css/vars/dist/spectrum-medium.css';
import '@spectrum-css/vars/dist/spectrum-light.css';

import '@spectrum-css/page/dist/index-vars.css';
import '@spectrum-css/icon/dist/index-vars.css';
import '@spectrum-css/link/dist/index-vars.css';
import '@spectrum-css/button/dist/index-vars.css';
import '@spectrum-css/actionbutton/dist/index-vars.css';
import '@spectrum-css/divider/dist/index-vars.css';
import '@spectrum-css/fieldlabel/dist/index-vars.css';
import '@spectrum-css/textfield/dist/index-vars.css';
import '@spectrum-css/slider/dist/index-vars.css';
import '@spectrum-css/tabs/dist/index-vars.css';
import '@spectrum-css/typography/dist/index-vars.css';
import '@spectrum-css/progresscircle/dist/index-vars.css';

import './scss/style.scss';
import './scss/components/header.scss';
import './scss/imageStudio.scss';

import '@adobe/focus-ring-polyfill';
import loadIcons from 'loadicons';
import {pageLoader} from './js/pageLoader';
import {initImageStudio} from './js/imageStudio';

loadIcons('./spectrum-css-icons.svg');
loadIcons('./spectrum-icons.svg');

// Force light mode for Image Studio (ignore system preference)
document.body.classList.add('spectrum--light', 'imageStudioPage');
document.body.classList.remove('spectrum--darkest');

initImageStudio();

window.onload = function () {
  pageLoader();
};
