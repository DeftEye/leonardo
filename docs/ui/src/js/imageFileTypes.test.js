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

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {isSupportedImageFile} from './imageFileTypes.js';

describe('isSupportedImageFile', () => {
  it('accepts common image MIME types', () => {
    assert.equal(isSupportedImageFile({type: 'image/png'}), true);
    assert.equal(isSupportedImageFile({type: 'image/jpeg'}), true);
    assert.equal(isSupportedImageFile({type: 'image/webp'}), true);
  });

  it('rejects non-image MIME types such as PDF', () => {
    assert.equal(isSupportedImageFile({type: 'application/pdf'}), false);
    assert.equal(isSupportedImageFile({type: 'text/plain'}), false);
  });

  it('rejects missing or empty type', () => {
    assert.equal(isSupportedImageFile(null), false);
    assert.equal(isSupportedImageFile({}), false);
    assert.equal(isSupportedImageFile({type: ''}), false);
  });
});
