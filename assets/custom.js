$(document).ready(function () {
	/*Responsive video home, rompe a 678px*/
	var videoSrcMobile = $('#video-home').attr('data-mobile');
	var videoSrcDesktop = $('#video-home').attr('data-desktop');
	var imgSrcMobile = $('#img-home').attr('data-mobile');
	var imgSrcDesktop = $('#img-home').attr('data-desktop');

	if (window.innerWidth > 678) {
		$("#video-home").attr("src", videoSrcDesktop);
		$("#img-home").attr("src", imgSrcDesktop);
	} else {
		$("#img-home").attr("src", imgSrcMobile);
		$("#video-home").attr("src", videoSrcMobile);
	}

	/*Tipos de jugador Home*/
	$('.listado-tipos-jugador li').click(function () {
		var selected = $(this).attr('data-filter');

		$('.listado-tipos-jugador li').removeClass('selected');
		$(this).addClass('selected');

		$('#tipos-jugador .cont-figure .cont-zapa').removeClass('selected');
		$('#tipos-jugador .cont-figure .figure-' + selected).addClass('selected');

		$('#tipos-jugador .button').attr('href', 'collections/' + selected);
	});

	/* Bloque flash home */
	$("#flash-home").on("change", "input[name='categoria_flash']", function () {
		$('#flash-home .flash-home-cont').removeClass('visible');
		$('#flash-home .' + $(this).val()).addClass('visible');

		// Recalculate scrollbar for new visible content
		initCustomScrollbar('#flash-home', '.flash-home-cont.visible');
	});

	/* Custom Scrollbar Logic */
	function initCustomScrollbar(sectionId, containerSelector) {
		var $section = $(sectionId);
		// Removed hardcoded .visible. Now containerSelector must include it if needed.
		var $realContainer = $section.find(containerSelector);
		var $track = $section.find('.custom-scroll-track');
		var $thumb = $section.find('.custom-scroll-thumb');

		if ($realContainer.length === 0 || $track.length === 0) return;

		// Calculate functionality
		var scrollWidth = $realContainer[0].scrollWidth;
		var clientWidth = $realContainer[0].clientWidth;
		var trackWidth = $track.width();

		// If content fits, hide thumb or track?
		if (scrollWidth <= clientWidth) {
			$track.hide();
			return;
		} else {
			$track.show();
		}

		// Calculate thumb width ratio
		// We want the thumb width to represent the viewport ratio
		// thumbWidth / trackWidth = clientWidth / scrollWidth
		var thumbWidth = (clientWidth / scrollWidth) * trackWidth;
		// console.log("Custom Scrollbar ("+sectionId+"): TrackW:", trackWidth, "ThumbW (calc):", thumbWidth);

		// Min width constraint
		if (thumbWidth < 30) thumbWidth = 30;
		$thumb.width(thumbWidth);

		// Max possible movement for scroll and thumb
		var maxScrollLeft = scrollWidth - clientWidth;
		var maxThumbLeft = trackWidth - thumbWidth;

		// Sync: Real Scroll -> Thumb
		$realContainer.off('scroll.custom');
		$realContainer.on('scroll.custom', function () {
			var scrollLeft = $(this).scrollLeft();

			// Recalculate maxScrollLeft on the fly in case content grew (lazy load)
			// This prevents the ratio from exceeding 1 and pushing thumb out
			var currentScrollWidth = this.scrollWidth;
			var currentClientWidth = this.clientWidth;
			if (currentScrollWidth !== scrollWidth) {
				scrollWidth = currentScrollWidth;
				clientWidth = currentClientWidth;
				maxScrollLeft = scrollWidth - clientWidth;
				// Update thumb width too if we want perfection, but clamping is critical
				// For now, just ensuring ratio is correct
			}

			var scrollRatio = scrollLeft / maxScrollLeft;
			if (scrollRatio > 1) scrollRatio = 1; // CLAMP FIX
			if (scrollRatio < 0) scrollRatio = 0;

			var thumbLeft = scrollRatio * maxThumbLeft;

			// Allow GPU acceleration or simple css left
			$thumb.css('left', thumbLeft + 'px');
		});

		// Sync: Drag Thumb -> Real Scroll
		var isDragging = false;
		var startX;
		var startLeft;

		$thumb.off('mousedown.custom touchstart.custom');
		$thumb.on('mousedown.custom touchstart.custom', function (e) {
			e.preventDefault(); // prevent selection
			isDragging = true;

			var clientX = e.type.includes('mouse') ? e.clientX : e.originalEvent.touches[0].clientX;
			startX = clientX;
			startLeft = parseFloat($thumb.css('left')) || 0;

			$(document).on('mousemove.custom touchmove.custom', onMove);
			$(document).on('mouseup.custom touchend.custom', onEnd);
		});

		function onMove(e) {
			if (!isDragging) return;
			var clientX = e.type.includes('mouse') ? e.clientX : e.originalEvent.touches[0].clientX;
			var deltaX = clientX - startX;
			var newLeft = startLeft + deltaX;

			if (newLeft < 0) newLeft = 0;
			if (newLeft > maxThumbLeft) newLeft = maxThumbLeft;

			$thumb.css('left', newLeft + 'px');

			// Find ratio and scroll content
			var ratio = newLeft / maxThumbLeft;
			$realContainer.scrollLeft(ratio * maxScrollLeft);
		}

		function onEnd() {
			isDragging = false;
			$(document).off('mousemove.custom touchmove.custom');
			$(document).off('mouseup.custom touchend.custom');
		}

		// Initial Sync
		$realContainer.trigger('scroll.custom');


		// Sync: Start Drag on Content (Grab & Drag)
		var isContentDragging = false;
		var contentStartX;
		var contentScrollLeft;
		var velX = 0;
		var lastX = 0;
		var momentumID;

		$realContainer.css({ 'cursor': 'grab', 'user-select': 'none' });

		$realContainer.off('mousedown.drag touchstart.drag');
		$realContainer.on('mousedown.drag touchstart.drag', function (e) {
			isContentDragging = true;
			cancelAnimationFrame(momentumID); // Stop previous momentum
			$realContainer.css('cursor', 'grabbing');
			var clientX = e.pageX || e.originalEvent.touches[0].pageX;
			contentStartX = clientX;
			lastX = clientX;
			velX = 0;
			contentScrollLeft = $realContainer.scrollLeft();
		});

		$realContainer.off('mouseleave.drag mouseup.drag touchend.drag');
		$realContainer.on('mouseleave.drag mouseup.drag touchend.drag', function () {
			isContentDragging = false;
			$realContainer.css('cursor', 'grab');

			// Begin Momentum
			if (Math.abs(velX) > 1) {
				function momentumLoop() {
					if (isContentDragging) return; // Stop if user grabs again
					$realContainer.scrollLeft($realContainer.scrollLeft() - velX);
					velX *= 0.95; // Friction

					if (Math.abs(velX) > 0.5) {
						momentumID = requestAnimationFrame(momentumLoop);
					}
				}
				momentumLoop();
			}
		});

		$realContainer.off('mousemove.drag touchmove.drag');
		$realContainer.on('mousemove.drag touchmove.drag', function (e) {
			if (!isContentDragging) return;
			e.preventDefault();
			var clientX = e.pageX || e.originalEvent.touches[0].pageX;
			var delta = clientX - lastX;
			lastX = clientX;
			velX = delta; // Calculate velocity per frame

			var walk = (clientX - contentStartX) * 1.5;
			// We update reference because scrollLeft is dynamic, but for direct drag we want 1:1 or 1:1.5 feel
			// Actually pure scrollLeft tracking is better for momentum integration
			$realContainer.scrollLeft($realContainer.scrollLeft() - (delta * 1.5));
		});

		// FIX: Prevent ALL native drag interactions (images, text, links) to avoid "ghost" dragging
		$realContainer.on('dragstart', function (e) {
			e.preventDefault();
			return false;
		});

		// Prevent click on links if dragged
		var wasDragging = false;
		$realContainer.on('mousedown', function () { wasDragging = false; });
		$realContainer.on('mousemove', function () { if (isContentDragging) wasDragging = true; });
		$realContainer.find('a').on('click', function (e) {
			if (wasDragging) {
				e.preventDefault();
				wasDragging = false;
			}
		});

		// Auto-show on scroll (for mobile mostly)
		var scrollTimeout;
		$realContainer.on('scroll touchmove', function () {
			var $barContainer = $section.find('.container-scrollbar');
			$barContainer.addClass('scrolling');

			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(function () {
				// If not hovering
				if (!$section.is(':hover')) {
					$barContainer.removeClass('scrolling');
				}
			}, 1500);
		});
	}

	function initAllScrollbars() {
		// Init Destacados (Bloque Flash) - Needs .visible because it has tabs
		initCustomScrollbar('#flash-home', '.flash-home-cont.visible');
		// Init Los más vistos (Destacados Home) - Has .visible in HTML
		initCustomScrollbar('#destacados-home', '.destacados-home-cont');
		// Init Signatures
		initCustomScrollbar('#signatures-home', '.signatures-home-cont');
		/* Custom Scrollbar Logic */
		// Init Amigos de la casa (Footer)
		initCustomScrollbar('#amigos-de-la-casa', '.scrollblanco-h');

		// Init Marcas Slider (Always visible desktop)
		initCustomScrollbar('#marcas-home', '.scrollnegro-h');

		// Init Categorías Destacadas
		initCustomScrollbar('#categorias-home', '.categorias-home-cont');

		// Init Colecciones Destacadas (home)
		initCustomScrollbar('#colecciones-destacadas-home', '.categorias-home-cont');
	}

	// Initialize on load and resize
	setTimeout(function () {
		initAllScrollbars();
	}, 1000); // 1s delay to ensure layout

	$(window).on('resize', function () {
		initAllScrollbars();
	});

	/*FACETS, filtros*/
	$('.facet-checkbox').click(function () {
		var inputID = $(this).children('.swatch-input-wrapper').children('.swatch-input__label').attr("for");
		$('#' + inputID).click();
	});

	/*LOAD MORE en Collections*/
	$('#product-grid').bind('DOMNodeInserted DOMNodeRemoved', function () {
		var total = $(this).children().length;

		//cambio texto
		$('.hasvisto-text > span').html(total);
		$('.hasvisto progress').val(total);
	});

	/*img métodos de pago product*/
	var link_img = $('.product .product__title').attr('data-img-met');
	$('#ProductAccordion-collapsible-row-3-template--18978849489140__main').html('<img src="' + link_img + '">').children('img').css('border', '0');
	$('#ProductAccordion-collapsible-row-3-template--18638285603068__main').html('<img src="' + link_img + '">').children('img').css('border', '0');

	/*Modal guia de talles single product*/
	$(document).on('click', '.open-guia-talles-variantes', function () {
		$('.modal-guia-de-talles').addClass('abierto');
	});

	$('.modal-guia-de-talles .modal .cerrar').click(function () {
		$('.modal-guia-de-talles').removeClass('abierto');
	});

	$('.modal-guia-de-talles').on('click', function (e) {
		if (e.target !== this)
			return;
		$('.modal-guia-de-talles').removeClass('abierto');
	});

	/*Menu mobile*/
	$('.hamburger-mobile').click(function () {
		$('.menu-mobile').addClass('active');
	});

	$('.menu-mobile .contenedor .cerrar').click(function () {
		$('.menu-mobile').removeClass('active');
	});

	$('.menu-mobile').on('click', function (e) {
		if (e.target !== this)
			return;
		$('.menu-mobile').removeClass('active');
	});

	/*Modal redes home*/
	$(document).on('click', '.open-iframe-redes', function (e) {
		e.preventDefault();
		var iframe = $(this).attr('data-iframe');
		$('.modal-iframe-redes .modal .content').html('<iframe src="https://www.instagram.com/p/' + iframe + '/embed/" scrolling="no" allowtransparency="true" allowfullscreen="true" frameborder="0">Iframe incompatible</iframe>');
		$('.modal-iframe-redes').addClass('abierto');
	});

	$('.modal-iframe-redes .modal .cerrar').click(function () {
		$('.modal-iframe-redes .modal .content').html('');
		$('.modal-iframe-redes').removeClass('abierto');
	});

	$('.modal-iframe-redes').on('click', function (e) {
		if (e.target !== this)
			return;
		$('.modal-iframe-redes .modal .content').html('');
		$('.modal-iframe-redes').removeClass('abierto');
	});

	/*Modal default*/
	$(document).on('click', '.open-modal', function () {
		var modal_class = $(this).attr('data-modal');
		$('.' + modal_class).addClass('abierto');
	});

	$('.modal-default .modal .cerrar').click(function () {
		var modal_class = $(this).attr('data-modal');
		$('.' + modal_class).removeClass('abierto');
	});

	$('.modal-default').on('click', function (e) {
		if (e.target !== this)
			return;
		$('.modal-default').removeClass('abierto');
	});

	/* Single prodcut gallery v2 */
	function activateMedia(mediaId, $thumb) {
		var $main = $('.product__media-list li[data-media-id="' + mediaId + '"]');

		if ($main.length) {
			$main.prependTo('.product__media-list');

			$('.product__media-list li').removeClass('is-active');
			$main.addClass('is-active');

			$('.media-thumbs li').removeClass('is-active');
			$thumb.addClass('is-active');
		}
	}

	$('.media-thumbs li').on('mouseenter touchstart', function (e) {
		var $thumb = $(this);
		var mediaId = $thumb.data('media-id');

		// Evitar que dispare múltiples veces en touch
		if (e.type === 'touchstart') {
			e.preventDefault(); // opcional para evitar scroll no deseado
			$(this).off('touchstart'); // evita múltiples activaciones
		}

		activateMedia(mediaId, $thumb);
	});
});