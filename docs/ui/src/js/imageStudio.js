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

import {saveAs} from 'file-saver';
import {throttle} from './utils';
import {extractPaletteFromImage, renderPaletteSwatches} from './imagePalette';
import {capturePreviewImageData, processImageData, paintImageData, renderExportBlob} from './imageRecolor';

const FILE_TYPES = ['image/apng', 'image/bmp', 'image/gif', 'image/jpeg', 'image/pjpeg', 'image/png', 'image/svg+xml', 'image/tiff', 'image/webp', 'image/x-icon'];

const state = {
  file: null,
  fileUrl: null,
  image: null,
  originalPreview: null,
  processedPreview: null,
  palette: [],
  strength: 0.7,
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0,
  showingOriginal: false,
  processing: false
};

function $(id) {
  return document.getElementById(id);
}

function validFileType(file) {
  return FILE_TYPES.includes(file.type);
}

function setControlsEnabled(enabled) {
  ['imageStudioClear', 'imageStudioExtract', 'imageRemapStrength', 'imageHue', 'imageSaturation', 'imageBrightness', 'imageContrast', 'imageStudioResetAdjust', 'imageStudioBeforeAfter', 'imageStudioDownload'].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = !enabled;
  });
}

function setProcessing(isProcessing) {
  state.processing = isProcessing;
  const badge = $('imageStudioProcessing');
  if (badge) badge.hidden = !isProcessing;
}

function updateSliderLabels() {
  $('imageRemapStrengthValue').textContent = `${Math.round(state.strength * 100)}%`;
  $('imageHueValue').textContent = `${state.hue}°`;
  $('imageSaturationValue').textContent = `${state.saturation}%`;
  $('imageBrightnessValue').textContent = `${state.brightness}%`;
  $('imageContrastValue').textContent = `${state.contrast}%`;
}

function getProcessOptions() {
  return {
    palette: state.palette,
    strength: state.strength,
    hue: state.hue,
    saturation: state.saturation,
    brightness: state.brightness,
    contrast: state.contrast
  };
}

function paintCurrent() {
  const canvas = $('imageStudioCanvas');
  if (!canvas || !state.originalPreview) return;
  const data = state.showingOriginal ? state.originalPreview : state.processedPreview || state.originalPreview;
  paintImageData(canvas, data);
}

function recomputePreview() {
  if (!state.originalPreview) return;
  setProcessing(true);

  // Yield so the processing indicator can paint
  requestAnimationFrame(() => {
    try {
      state.processedPreview = processImageData(state.originalPreview, getProcessOptions());
      if (!state.showingOriginal) paintCurrent();
    } finally {
      setProcessing(false);
    }
  });
}

const throttledRecompute = throttle(recomputePreview, 120);

function showCanvasView(show) {
  $('imageStudioDropzone').hidden = show;
  $('imageStudioCanvasWrap').hidden = !show;
}

function revokeFileUrl() {
  if (state.fileUrl) {
    URL.revokeObjectURL(state.fileUrl);
    state.fileUrl = null;
  }
}

function clearStudio() {
  revokeFileUrl();
  state.file = null;
  state.image = null;
  state.originalPreview = null;
  state.processedPreview = null;
  state.palette = [];
  state.strength = 0.7;
  state.hue = 0;
  state.saturation = 0;
  state.brightness = 0;
  state.contrast = 0;
  state.showingOriginal = false;

  $('imageStudioUpload').value = '';
  $('imageRemapStrength').value = '70';
  $('imageHue').value = '0';
  $('imageSaturation').value = '0';
  $('imageBrightness').value = '0';
  $('imageContrast').value = '0';
  updateSliderLabels();

  const meta = $('imageStudioFileMeta');
  meta.hidden = true;
  meta.textContent = '';

  renderPaletteSwatches($('imageStudioSwatches'), [], () => {});
  showCanvasView(false);
  setControlsEnabled(false);
  setProcessing(false);
}

function loadImageElement(fileUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image'));
    image.src = fileUrl;
  });
}

async function handleFile(file) {
  if (!file || !validFileType(file)) {
    const meta = $('imageStudioFileMeta');
    meta.hidden = false;
    meta.textContent = file ? `“${file.name}” is not a supported image type.` : 'No file selected.';
    return;
  }

  revokeFileUrl();
  state.file = file;
  state.fileUrl = URL.createObjectURL(file);
  setProcessing(true);

  try {
    state.image = await loadImageElement(state.fileUrl);
    const canvas = $('imageStudioCanvas');
    state.originalPreview = capturePreviewImageData(state.image, canvas);
    state.processedPreview = null;

    const meta = $('imageStudioFileMeta');
    meta.hidden = false;
    meta.textContent = `${file.name} · ${state.image.naturalWidth}×${state.image.naturalHeight}px`;

    showCanvasView(true);
    setControlsEnabled(true);
    updateSliderLabels();

    state.palette = await extractPaletteFromImage(state.image);
    renderPaletteSwatches($('imageStudioSwatches'), state.palette, (index, hex) => {
      state.palette[index] = hex;
      throttledRecompute();
    });

    recomputePreview();
  } catch (err) {
    console.error(err);
    const meta = $('imageStudioFileMeta');
    meta.hidden = false;
    meta.textContent = 'Could not process that image. Try another file.';
    clearStudio();
  } finally {
    setProcessing(false);
  }
}

async function reextractPalette() {
  if (!state.image) return;
  setProcessing(true);
  try {
    state.palette = await extractPaletteFromImage(state.image);
    renderPaletteSwatches($('imageStudioSwatches'), state.palette, (index, hex) => {
      state.palette[index] = hex;
      throttledRecompute();
    });
    recomputePreview();
  } finally {
    setProcessing(false);
  }
}

function resetAdjustments() {
  state.hue = 0;
  state.saturation = 0;
  state.brightness = 0;
  state.contrast = 0;
  $('imageHue').value = '0';
  $('imageSaturation').value = '0';
  $('imageBrightness').value = '0';
  $('imageContrast').value = '0';
  updateSliderLabels();
  throttledRecompute();
}

async function downloadPng() {
  if (!state.image) return;
  setProcessing(true);
  try {
    // Prefer full-resolution export when image is reasonably sized; otherwise export preview pipeline
    const maxExportPixels = 4000 * 4000;
    const pixels = state.image.naturalWidth * state.image.naturalHeight;
    let blob;
    if (pixels <= maxExportPixels) {
      blob = await renderExportBlob(state.image, getProcessOptions());
    } else if (state.processedPreview) {
      const canvas = document.createElement('canvas');
      paintImageData(canvas, state.processedPreview);
      blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png');
      });
    }
    if (blob) {
      const base = (state.file?.name || 'image').replace(/\.[^.]+$/, '');
      saveAs(blob, `${base}-recolored.png`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    setProcessing(false);
  }
}

function bindDropzone() {
  const stage = $('imageStudioStage');
  const dropzone = $('imageStudioDropzone');

  const onDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragEnter = (e) => {
    onDrag(e);
    stage.classList.add('is-dragover');
  };

  const onDragLeave = (e) => {
    onDrag(e);
    if (!stage.contains(e.relatedTarget)) {
      stage.classList.remove('is-dragover');
    }
  };

  const onDrop = (e) => {
    onDrag(e);
    stage.classList.remove('is-dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  [stage, dropzone].forEach((el) => {
    el.addEventListener('dragenter', onDragEnter);
    el.addEventListener('dragover', onDragEnter);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
  });
}

function initImageStudio() {
  const upload = $('imageStudioUpload');
  if (!upload) return;

  renderPaletteSwatches($('imageStudioSwatches'), [], () => {});
  updateSliderLabels();
  setControlsEnabled(false);
  bindDropzone();

  upload.addEventListener('change', () => {
    const file = upload.files?.[0];
    if (file) handleFile(file);
  });

  $('imageStudioClear').addEventListener('click', clearStudio);
  $('imageStudioExtract').addEventListener('click', reextractPalette);
  $('imageStudioResetAdjust').addEventListener('click', resetAdjustments);
  $('imageStudioDownload').addEventListener('click', downloadPng);

  $('imageRemapStrength').addEventListener('input', (e) => {
    state.strength = Number(e.target.value) / 100;
    updateSliderLabels();
    throttledRecompute();
  });

  $('imageHue').addEventListener('input', (e) => {
    state.hue = Number(e.target.value);
    updateSliderLabels();
    throttledRecompute();
  });

  $('imageSaturation').addEventListener('input', (e) => {
    state.saturation = Number(e.target.value);
    updateSliderLabels();
    throttledRecompute();
  });

  $('imageBrightness').addEventListener('input', (e) => {
    state.brightness = Number(e.target.value);
    updateSliderLabels();
    throttledRecompute();
  });

  $('imageContrast').addEventListener('input', (e) => {
    state.contrast = Number(e.target.value);
    updateSliderLabels();
    throttledRecompute();
  });

  const compareBtn = $('imageStudioBeforeAfter');
  const showOriginal = () => {
    state.showingOriginal = true;
    compareBtn.setAttribute('aria-pressed', 'true');
    paintCurrent();
  };
  const showProcessed = () => {
    state.showingOriginal = false;
    compareBtn.setAttribute('aria-pressed', 'false');
    paintCurrent();
  };
  compareBtn.addEventListener('mousedown', showOriginal);
  compareBtn.addEventListener('mouseup', showProcessed);
  compareBtn.addEventListener('mouseleave', showProcessed);
  compareBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    showOriginal();
  });
  compareBtn.addEventListener('touchend', showProcessed);
  compareBtn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      showOriginal();
    }
  });
  compareBtn.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      showProcessed();
    }
  });
}

export {initImageStudio, clearStudio, handleFile};
