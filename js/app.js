(function() {
    'use strict';

    var container = document.getElementById('map-container');
    var viewport = document.getElementById('map-viewport');
    var mapLayer = document.getElementById('map-layer');
    var mapImage = document.getElementById('map-image');
    var markersLayer = document.getElementById('markers-layer');
    var zoomLevelEl = document.getElementById('zoom-level');
    var sideNav = document.getElementById('side-nav');
    var sideNavList = document.getElementById('side-nav-list');
    var detailOverlay = document.getElementById('detail-overlay');
    var guideOverlay = document.getElementById('guide-overlay');
    var lightbox = document.getElementById('lightbox');
    var calibrateBar = document.getElementById('calibrate-bar');

    var MIN_SCALE = 0.2;
    var MAX_SCALE = 6;
    var ANIM_DURATION = 500;
    var AUTOPLAY_MS = 4000;

    var state = {
        scale: 1, offsetX: 0, offsetY: 0,
        imgW: 0, imgH: 0, viewW: 0, viewH: 0,
        isDragging: false, dragStartX: 0, dragStartY: 0, dragOffsetX: 0, dragOffsetY: 0,
        activeLandmarkId: null, currentLandmarkIndex: -1,
        animFrameId: null,
        pinchStartDist: 0, pinchStartScale: 1, pinchCenterX: 0, pinchCenterY: 0,
        isCalibrating: false, calDragIndex: -1, calDragStartX: 0, calDragStartY: 0,
        calDragOrigX: 0, calDragOrigY: 0,
        galleryImages: [], galleryIndex: 0, activeSlideId: 0, autoplayTimer: null
    };

    var markers = [];
    var sideNavItems = [];
    var calibratedPositions = {};
    var STORAGE_KEY = 'beijing_axis_calibrated_v2';
    var ADMIN_PASSWORD = '000000';

    function init() {
        loadCalibratedPositions();
        mapImage.addEventListener('load', onImageLoaded);
        if (mapImage.complete && mapImage.naturalWidth > 0) onImageLoaded();

        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        container.addEventListener('wheel', onWheel, { passive: false });
        container.addEventListener('dblclick', onDoubleClick);
        container.addEventListener('touchstart', onTouchStart, { passive: false });
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onTouchEnd);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onResize);

        document.getElementById('btn-reset').addEventListener('click', resetView);
        document.getElementById('btn-zoom-in').addEventListener('click', function() { zoomAt(1.3, state.viewW / 2, state.viewH / 2); });
        document.getElementById('btn-zoom-out').addEventListener('click', function() { zoomAt(1 / 1.3, state.viewW / 2, state.viewH / 2); });
        document.getElementById('btn-guide').addEventListener('click', openGuide);

        document.getElementById('detail-close').addEventListener('click', closeDetail);
        document.getElementById('detail-prev').addEventListener('click', function() { navigateDetail(-1); });
        document.getElementById('detail-next').addEventListener('click', function() { navigateDetail(1); });
        document.getElementById('detail-overlay').querySelector('.overlay-backdrop').addEventListener('click', closeDetail);

        document.getElementById('guide-close').addEventListener('click', closeGuide);
        document.getElementById('guide-overlay').querySelector('.overlay-backdrop').addEventListener('click', closeGuide);

        document.getElementById('side-nav-toggle').addEventListener('click', toggleSideNav);
        document.getElementById('side-nav-close').addEventListener('click', closeSideNav);

        document.getElementById('gallery-stage').addEventListener('click', openLightbox);

        document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
        document.getElementById('lightbox').querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);

        document.getElementById('btn-calibrate').addEventListener('click', toggleCalibrate);
        document.getElementById('btn-cal-save').addEventListener('click', saveCalibration);
        document.getElementById('btn-cal-reset').addEventListener('click', resetCalibration);
        document.getElementById('btn-cal-exit').addEventListener('click', exitCalibrate);

        bindDotClicks();

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (!lightbox.classList.contains('lightbox-hidden')) closeLightbox();
                else if (!guideOverlay.classList.contains('overlay-hidden')) closeGuide();
                else if (!detailOverlay.classList.contains('overlay-hidden')) closeDetail();
                else if (state.isCalibrating) exitCalibrate();
            }
        });

        loadGalleryImages();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function() {});
        }
    }

    function bindDotClicks() {
        var dots = document.querySelectorAll('.gallery-dot');
        dots.forEach(function(dot) {
            dot.addEventListener('click', function(e) {
                e.stopPropagation();
                goToGallery(parseInt(this.getAttribute('data-dot')));
            });
        });
    }

    function loadGalleryImages() {
        if (typeof GALLERY_IMAGES !== 'undefined') {
            LANDMARKS.forEach(function(lm) {
                if (GALLERY_IMAGES[lm.id]) lm.galleryImages = GALLERY_IMAGES[lm.id];
            });
            return;
        }
        fetch('assets/images/gallery/manifest.json')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                LANDMARKS.forEach(function(lm) {
                    if (data[lm.id]) lm.galleryImages = data[lm.id];
                });
            })
            .catch(function() {});
    }

    function onImageLoaded() {
        state.imgW = mapImage.naturalWidth;
        state.imgH = mapImage.naturalHeight;
        mapImage.style.width = state.imgW + 'px';
        mapImage.style.height = state.imgH + 'px';
        mapLayer.style.width = state.imgW + 'px';
        mapLayer.style.height = state.imgH + 'px';
        markersLayer.style.width = state.imgW + 'px';
        markersLayer.style.height = state.imgH + 'px';
        updateViewportSize();
        createMarkers();
        buildSideNav();
        fitToScreen();
        updateTransform(false);
    }

    function updateViewportSize() {
        state.viewW = viewport.clientWidth;
        state.viewH = viewport.clientHeight;
    }

    function fitToScreen() {
        var p = 40;
        var s = Math.min((state.viewW - p * 2) / state.imgW, (state.viewH - p * 2) / state.imgH, 1);
        state.scale = s;
        state.offsetX = (state.viewW - state.imgW * s) / 2;
        state.offsetY = (state.viewH - state.imgH * s) / 2;
    }

    function resetView() {
        fitToScreen();
        closeDetail();
        updateTransform(true);
    }

    function getLandmarkPos(index) {
        var lm = LANDMARKS[index];
        var cal = calibratedPositions[lm.id];
        return { x: cal ? cal.x : lm.x, y: cal ? cal.y : lm.y };
    }

    function createMarkers() {
        markersLayer.innerHTML = '';
        markers = [];
        LANDMARKS.forEach(function(lm, i) {
            var pos = getLandmarkPos(i);
            var el = document.createElement('div');
            el.className = 'landmark-marker';
            if (state.isCalibrating) el.classList.add('calibrating');
            el.style.left = pos.x + '%';
            el.style.top = pos.y + '%';
            el.setAttribute('data-index', i);
            el.innerHTML = '<div class="marker-dot"></div><span class="marker-label">' + lm.name + '</span>';
            el.addEventListener('click', function(e) {
                if (state.isCalibrating) return;
                e.stopPropagation();
                closeSideNav();
                openDetail(i);
            });
            el.addEventListener('mousedown', function(e) { if (state.isCalibrating) onCalDragStart(e, i); });
            el.addEventListener('touchstart', function(e) { if (state.isCalibrating) onCalDragStart(e, i); }, { passive: false });
            markersLayer.appendChild(el);
            markers.push({ el: el, data: lm, index: i });
        });
    }

    function refreshMarkerPositions() {
        markers.forEach(function(m) {
            var pos = getLandmarkPos(m.index);
            m.el.style.left = pos.x + '%';
            m.el.style.top = pos.y + '%';
        });
    }

    function updateTransform(animate) {
        if (animate) {
            mapLayer.style.transition = 'transform ' + (ANIM_DURATION / 1000) + 's cubic-bezier(0.22, 0.61, 0.36, 1)';
            setTimeout(function() { mapLayer.style.transition = 'none'; }, ANIM_DURATION);
        }
        mapLayer.style.transform = 'translate(' + state.offsetX + 'px, ' + state.offsetY + 'px) scale(' + state.scale + ')';
        updateZoomIndicator();
        updateMarkerScales();
    }

    function clampOffset() {
        var sw = state.imgW * state.scale;
        var sh = state.imgH * state.scale;
        var mx = state.viewW - sw;
        var my = state.viewH - sh;
        state.offsetX = Math.min(0, Math.max(mx, state.offsetX));
        state.offsetY = Math.min(0, Math.max(my, state.offsetY));
        if (sw < state.viewW) state.offsetX = (state.viewW - sw) / 2;
        if (sh < state.viewH) state.offsetY = (state.viewH - sh) / 2;
    }

    function zoomAt(factor, cx, cy) {
        var ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, state.scale * factor));
        var rf = ns / state.scale;
        state.offsetX = cx - rf * (cx - state.offsetX);
        state.offsetY = cy - rf * (cy - state.offsetY);
        state.scale = ns;
        clampOffset();
        updateTransform(false);
    }

    function onWheel(e) {
        if (state.isCalibrating) return;
        e.preventDefault();
        var rect = viewport.getBoundingClientRect();
        zoomAt(1 + (e.deltaY > 0 ? -1 : 1) * 0.15, e.clientX - rect.left, e.clientY - rect.top);
    }

    function onDoubleClick(e) {
        if (state.isCalibrating) return;
        var rect = viewport.getBoundingClientRect();
        zoomAt(1.5, e.clientX - rect.left, e.clientY - rect.top);
    }

    function onMouseDown(e) {
        if (e.button !== 0) return;
        if (state.isCalibrating && e.target.closest('.landmark-marker')) return;
        if (e.target.closest('.landmark-marker') || e.target.closest('button') || e.target.closest('#side-nav')) return;
        state.isDragging = true;
        state.dragStartX = e.clientX;
        state.dragStartY = e.clientY;
        state.dragOffsetX = state.offsetX;
        state.dragOffsetY = state.offsetY;
        container.classList.add('grabbing');
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (state.isCalibrating && state.calDragIndex >= 0) {
            onCalDragMove(e);
            return;
        }
        if (!state.isDragging) return;
        state.offsetX = state.dragOffsetX + e.clientX - state.dragStartX;
        state.offsetY = state.dragOffsetY + e.clientY - state.dragStartY;
        clampOffset();
        updateTransform(false);
    }

    function onMouseUp() {
        state.isDragging = false;
        container.classList.remove('grabbing');
        state.calDragIndex = -1;
        markers.forEach(function(m) { m.el.classList.remove('dragging'); });
    }

    function onTouchStart(e) {
        if (state.isCalibrating && e.touches.length === 1 && e.target.closest('.landmark-marker')) {
            onCalDragStart(e, parseInt(e.target.closest('.landmark-marker').getAttribute('data-index')));
            e.preventDefault();
            return;
        }
        if (e.touches.length === 1) {
            state.isDragging = true;
            state.dragStartX = e.touches[0].clientX;
            state.dragStartY = e.touches[0].clientY;
            state.dragOffsetX = state.offsetX;
            state.dragOffsetY = state.offsetY;
            container.classList.add('grabbing');
            e.preventDefault();
        } else if (e.touches.length === 2) {
            state.isDragging = false;
            state.pinchStartDist = getTouchDist(e.touches);
            state.pinchStartScale = state.scale;
            var rect = viewport.getBoundingClientRect();
            state.pinchCenterX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            state.pinchCenterY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
            e.preventDefault();
        }
    }

    function onTouchMove(e) {
        if (state.isCalibrating && state.calDragIndex >= 0) {
            onCalDragMove(e.touches[0]);
            e.preventDefault();
            return;
        }
        if (e.touches.length === 1 && state.isDragging) {
            state.offsetX = state.dragOffsetX + e.touches[0].clientX - state.dragStartX;
            state.offsetY = state.dragOffsetY + e.touches[0].clientY - state.dragStartY;
            clampOffset();
            updateTransform(false);
            e.preventDefault();
        } else if (e.touches.length === 2) {
            var d = getTouchDist(e.touches);
            var f = d / state.pinchStartDist;
            var sensitivity = 0.85;
            var ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, state.pinchStartScale * (1 + (f - 1) * sensitivity)));
            var rf = ns / state.scale;
            state.offsetX = state.pinchCenterX - rf * (state.pinchCenterX - state.offsetX);
            state.offsetY = state.pinchCenterY - rf * (state.pinchCenterY - state.offsetY);
            state.scale = ns;
            clampOffset();
            updateTransform(false);
            e.preventDefault();
        }
    }

    function onTouchEnd() {
        state.isDragging = false;
        container.classList.remove('grabbing');
        state.calDragIndex = -1;
        markers.forEach(function(m) { m.el.classList.remove('dragging'); });
    }

    function getTouchDist(t) {
        return Math.sqrt(Math.pow(t[0].clientX - t[1].clientX, 2) + Math.pow(t[0].clientY - t[1].clientY, 2));
    }

    function updateMarkerScales() {
        var inv = state.isCalibrating ? 1 : 1 / state.scale;
        var hideLabel = state.scale < 0.5 || state.scale > 4;
        markers.forEach(function(m) {
            m.el.style.transform = 'translate(-50%, -50%) scale(' + inv + ')';
            m.el.classList.toggle('label-hidden', hideLabel);
        });
    }

    function updateMarkersActive() {
        markers.forEach(function(m) {
            m.el.classList.toggle('active', m.data.id === state.activeLandmarkId);
        });
    }

    function updateZoomIndicator() {
        zoomLevelEl.textContent = Math.round(state.scale * 100) + '%';
    }

    /* ========== 校准模式 ========== */
    function loadCalibratedPositions() {
        try { var raw = localStorage.getItem(STORAGE_KEY); if (raw) calibratedPositions = JSON.parse(raw); }
        catch(e) { calibratedPositions = {}; }
    }

    function toggleCalibrate() {
        if (!state.isCalibrating) {
            var pw = prompt('请输入管理员密码：');
            if (pw !== ADMIN_PASSWORD) {
                if (pw !== null) alert('密码错误！');
                return;
            }
        }
        state.isCalibrating = !state.isCalibrating;
        if (state.isCalibrating) {
            calibrateBar.classList.remove('calibrate-hidden');
            container.classList.add('calibrating');
            container.style.cursor = 'default';
            document.getElementById('btn-calibrate').classList.add('active');
            closeDetail();
        } else { exitCalibrate(); }
        markers.forEach(function(m) { m.el.classList.toggle('calibrating', state.isCalibrating); });
        updateMarkerScales();
    }

    function exitCalibrate() {
        state.isCalibrating = false;
        calibrateBar.classList.add('calibrate-hidden');
        container.classList.remove('calibrating');
        container.style.cursor = 'grab';
        document.getElementById('btn-calibrate').classList.remove('active');
        state.calDragIndex = -1;
        markers.forEach(function(m) { m.el.classList.remove('calibrating', 'dragging'); });
        updateMarkerScales();
    }

    function onCalDragStart(e, index) {
        state.calDragIndex = index;
        var ce = e.touches ? e.touches[0] : e;
        state.calDragStartX = ce.clientX;
        state.calDragStartY = ce.clientY;
        var pos = getLandmarkPos(index);
        state.calDragOrigX = pos.x;
        state.calDragOrigY = pos.y;
        markers[index].el.classList.add('dragging');
        if (!e.touches) e.preventDefault();
    }

    function onCalDragMove(ce) {
        if (state.calDragIndex < 0) return;
        var dx = (ce.clientX - state.calDragStartX) / state.imgW * 100;
        var dy = (ce.clientY - state.calDragStartY) / state.imgH * 100;
        var nx = Math.max(0, Math.min(100, state.calDragOrigX + dx));
        var ny = Math.max(0, Math.min(100, state.calDragOrigY + dy));
        calibratedPositions[LANDMARKS[state.calDragIndex].id] = { x: Math.round(nx * 100) / 100, y: Math.round(ny * 100) / 100 };
        refreshMarkerPositions();
    }

    function saveCalibration() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(calibratedPositions));
        var count = Object.keys(calibratedPositions).length;
        exitCalibrate();
        alert('已保存 ' + count + ' 个地标的校准位置！');
    }

    function resetCalibration() {
        calibratedPositions = {};
        localStorage.removeItem(STORAGE_KEY);
        refreshMarkerPositions();
        alert('已恢复默认位置。');
    }

    /* ========== 左侧浮动导航 ========== */
    function buildSideNav() {
        sideNavList.innerHTML = '';
        sideNavItems = [];
        LANDMARKS.slice().reverse().forEach(function(lm) {
            var i = LANDMARKS.indexOf(lm);
            var item = document.createElement('div');
            item.className = 'side-nav-item';
            item.setAttribute('data-index', i);
            item.innerHTML = '<img class="side-nav-thumb" src="' + lm.icon + '" alt="' + lm.name + '" loading="lazy"><span class="side-nav-name">' + lm.name + '</span>';
            item.addEventListener('click', function() {
                closeSideNav();
                flyToLandmark(i);
                openDetail(i);
            });
            sideNavList.appendChild(item);
            sideNavItems.push({ el: item, index: i });
        });
    }

    function updateSideNavActive() {
        sideNavItems.forEach(function(s) { s.el.classList.toggle('active', s.index === state.currentLandmarkIndex); });
    }

    function toggleSideNav() {
        if (sideNav.classList.contains('side-nav-collapsed')) {
            sideNav.classList.remove('side-nav-collapsed');
            sideNav.classList.add('side-nav-expanded');
        } else {
            closeSideNav();
        }
    }

    function closeSideNav() {
        sideNav.classList.remove('side-nav-expanded');
        sideNav.classList.add('side-nav-collapsed');
    }

    /* ========== 详情弹窗 ========== */
    function openDetail(index) {
        var lm = LANDMARKS[index];
        if (!lm) return;
        state.activeLandmarkId = lm.id;
        state.currentLandmarkIndex = index;
        state.galleryImages = lm.galleryImages || [];
        state.galleryIndex = 0;
        state.activeSlideId = 0;

        detailOverlay.classList.remove('overlay-hidden');

        document.getElementById('overlay-title').textContent = lm.name;
        document.getElementById('overlay-era').textContent = lm.era;

        var year = lm.year;
        var nowYear = new Date().getFullYear();
        var yearsAgo = nowYear - year;
        document.getElementById('overlay-years').textContent = '距今 ' + yearsAgo + ' 年';

        var descHtml = lm.desc
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/【([^】]+)】/g, '<strong class="desc-header">【$1】</strong>');
        document.getElementById('detail-desc').innerHTML = descHtml;
        document.getElementById('detail-index').textContent = (index + 1) + ' / ' + LANDMARKS.length;

        var prevIndex = index - 1;
        if (prevIndex < 0) prevIndex = LANDMARKS.length - 1;
        var nextIndex = index + 1;
        if (nextIndex >= LANDMARKS.length) nextIndex = 0;
        document.getElementById('detail-prev').innerHTML = '◀ ' + LANDMARKS[prevIndex].name;
        document.getElementById('detail-next').innerHTML = LANDMARKS[nextIndex].name + ' ▶';

        setupGallery();
        updateMarkersActive();
        updateSideNavActive();
    }

    function closeDetail() {
        detailOverlay.classList.add('overlay-hidden');
        state.activeLandmarkId = null;
        state.currentLandmarkIndex = -1;
        stopAutoplay();
        updateMarkersActive();
        updateSideNavActive();
    }

    function navigateDetail(dir) {
        var ni = state.currentLandmarkIndex + dir;
        if (ni < 0) ni = LANDMARKS.length - 1;
        if (ni >= LANDMARKS.length) ni = 0;
        openDetail(ni);
    }

    function flyToLandmark(index) {
        var lm = LANDMARKS[index];
        if (!lm) return;
        var pos = getLandmarkPos(index);
        var ts = Math.min(MAX_SCALE, Math.max(1.5, state.scale));
        var ix = (pos.x / 100) * state.imgW;
        var iy = (pos.y / 100) * state.imgH;
        var tx = state.viewW / 2 - ix * ts;
        var ty = state.viewH / 2 - iy * ts;
        var ss = state.scale, sx = state.offsetX, sy = state.offsetY;
        var st = performance.now();

        function anim(now) {
            var p = Math.min(1, (now - st) / ANIM_DURATION);
            var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            state.scale = ss + (ts - ss) * e;
            state.offsetX = sx + (tx - sx) * e;
            state.offsetY = sy + (ty - sy) * e;
            clampOffset();
            updateTransform(false);
            if (p < 1) state.animFrameId = requestAnimationFrame(anim);
        }
        if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
        state.animFrameId = requestAnimationFrame(anim);
    }

    /* ========== 画廊系统 ========== */
    function setupGallery() {
        stopAutoplay();
        var urls = state.galleryImages;
        var hasImages = urls && urls.length > 0;
        var errorEl = document.getElementById('gallery-error');

        if (!hasImages) {
            errorEl.classList.add('show');
            document.querySelectorAll('.gallery-slide img').forEach(function(img) { img.src = ''; });
            document.querySelectorAll('.gallery-slide').forEach(function(s) { s.classList.remove('active'); });
            updateDots(0, 0);
            return;
        }

        errorEl.classList.remove('show');

        preloadImages(urls, function() {
            state.galleryIndex = 0;
            state.activeSlideId = 0;

            var slide0 = document.getElementById('gallery-slide-0');
            var slide1 = document.getElementById('gallery-slide-1');
            slide0.classList.add('active');
            slide1.classList.remove('active');
            slide0.querySelector('img').src = urls[0];
            slide0.querySelector('img').onerror = function() { onImageError(this); };
            slide1.querySelector('img').src = '';
            slide1.querySelector('img').onerror = null;

            updateDots(0, urls.length);
            startAutoplay();
        });
    }

    function preloadImages(urls, callback) {
        var loaded = 0;
        var total = urls.length;
        if (total === 0) { callback(); return; }

        var done = false;
        function finish() {
            if (done) return;
            done = true;
            clearTimeout(safety);
            callback();
        }

        urls.forEach(function(url) {
            var img = new Image();
            img.onload = function() { loaded++; if (loaded === total) finish(); };
            img.onerror = function() { loaded++; if (loaded === total) finish(); };
            img.src = url;
        });

        var safety = setTimeout(finish, 3000);
    }

    function goToGallery(index) {
        var urls = state.galleryImages;
        if (!urls || urls.length === 0) return;
        if (index === state.galleryIndex) return;

        state.galleryIndex = index;
        var nextSlideId = state.activeSlideId === 0 ? 1 : 0;
        var nextSlide = document.getElementById('gallery-slide-' + nextSlideId);

        nextSlide.querySelector('img').src = urls[index];
        nextSlide.querySelector('img').onerror = function() { onImageError(this); };

        document.getElementById('gallery-slide-' + state.activeSlideId).classList.remove('active');
        nextSlide.classList.add('active');
        state.activeSlideId = nextSlideId;

        updateDots(index, urls.length);
        resetAutoplay();
    }

    function onImageError(imgEl) {
        imgEl.src = 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23333">' +
            '<rect width="400" height="300" fill="%231a1a1a"/>' +
            '<text x="200" y="140" text-anchor="middle" fill="%23666" font-size="48">🖼️</text>' +
            '<text x="200" y="175" text-anchor="middle" fill="%23888" font-size="14">图片加载失败</text></svg>'
        );
    }

    function updateDots(activeIndex, total) {
        var dots = document.querySelectorAll('.gallery-dot');
        dots.forEach(function(dot, i) {
            dot.classList.toggle('active', i === activeIndex);
            dot.style.display = i < total ? '' : 'none';
        });
    }

    function startAutoplay() {
        stopAutoplay();
        var urls = state.galleryImages;
        if (!urls || urls.length <= 1) return;
        state.autoplayTimer = setInterval(function() {
            var next = state.galleryIndex + 1;
            if (next >= urls.length) next = 0;
            goToGallery(next);
        }, AUTOPLAY_MS);
    }

    function stopAutoplay() {
        if (state.autoplayTimer) { clearInterval(state.autoplayTimer); state.autoplayTimer = null; }
    }

    function resetAutoplay() {
        if (state.autoplayTimer) { stopAutoplay(); startAutoplay(); }
    }

    /* ========== 灯箱 ========== */
    function openLightbox() {
        var urls = state.galleryImages;
        if (!urls || urls.length === 0) return;
        document.getElementById('lightbox-img').src = urls[state.galleryIndex];
        document.getElementById('lightbox-counter').textContent = (state.galleryIndex + 1) + ' / ' + urls.length;
        lightbox.classList.remove('lightbox-hidden');
    }

    function closeLightbox() { lightbox.classList.add('lightbox-hidden'); }

    /* ========== 指南弹窗 ========== */
    function openGuide() { guideOverlay.classList.remove('overlay-hidden'); }
    function closeGuide() { guideOverlay.classList.add('overlay-hidden'); }

    /* ========== 键盘 ========== */
    function onKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (state.isCalibrating) {
            var step = e.shiftKey ? 1 : 0.1;
            var idx = state.calDragIndex >= 0 ? state.calDragIndex : (state.currentLandmarkIndex >= 0 ? state.currentLandmarkIndex : 0);
            if (idx < 0 || idx >= LANDMARKS.length) return;
            var lmId = LANDMARKS[idx].id;
            var cur = calibratedPositions[lmId] || getLandmarkPos(idx);
            switch (e.key) {
                case 'ArrowUp': cur.y = Math.max(0, cur.y - step); break;
                case 'ArrowDown': cur.y = Math.min(100, cur.y + step); break;
                case 'ArrowLeft': cur.x = Math.max(0, cur.x - step); break;
                case 'ArrowRight': cur.x = Math.min(100, cur.x + step); break;
                default: return;
            }
            calibratedPositions[lmId] = { x: Math.round(cur.x * 100) / 100, y: Math.round(cur.y * 100) / 100 };
            refreshMarkerPositions();
            e.preventDefault();
            return;
        }

        var ps = 60;
        switch (e.key) {
            case 'ArrowUp': state.offsetY -= ps; clampOffset(); updateTransform(false); e.preventDefault(); break;
            case 'ArrowDown': state.offsetY += ps; clampOffset(); updateTransform(false); e.preventDefault(); break;
            case 'ArrowLeft':
                if (!detailOverlay.classList.contains('overlay-hidden')) navigateDetail(-1);
                else { state.offsetX += ps; clampOffset(); updateTransform(false); }
                e.preventDefault(); break;
            case 'ArrowRight':
                if (!detailOverlay.classList.contains('overlay-hidden')) navigateDetail(1);
                else { state.offsetX -= ps; clampOffset(); updateTransform(false); }
                e.preventDefault(); break;
            case '+': case '=': zoomAt(1.3, state.viewW / 2, state.viewH / 2); e.preventDefault(); break;
            case '-': zoomAt(1 / 1.3, state.viewW / 2, state.viewH / 2); e.preventDefault(); break;
            case 'Home': resetView(); e.preventDefault(); break;
        }
    }

    function onResize() {
        updateViewportSize();
        clampOffset();
        updateTransform(false);
    }

    init();
})();
