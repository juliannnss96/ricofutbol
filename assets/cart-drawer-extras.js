/**
 * Cart drawer extras: cross-sell one-click add (without closing the drawer),
 * and a MutationObserver that detects when the free-shipping bar crosses its
 * threshold so the confetti/pulse animation fires exactly once.
 *
 * Kept separate from cart-drawer.js/cart.js (close to stock Dawn files) so
 * this feature's logic stays isolated and easy to find/maintain.
 */
(function () {
  var shippingBarReached = null;
  var pendingScroll = null;

  function getCartDrawer() {
    return document.querySelector('cart-drawer');
  }

  function getScrollTargets() {
    return {
      items: document.getElementById('CartDrawer-CartItems'),
      crossSell: document.querySelector('.cart-drawer__cross-sell-track'),
    };
  }

  function captureScroll() {
    var targets = getScrollTargets();
    pendingScroll = {
      items: targets.items ? targets.items.scrollTop : null,
      crossSell: targets.crossSell ? targets.crossSell.scrollLeft : null,
    };
  }

  function restoreScroll() {
    if (!pendingScroll) return;
    var targets = getScrollTargets();
    if (targets.items && pendingScroll.items !== null) {
      targets.items.scrollTop = pendingScroll.items;
    }
    if (targets.crossSell && pendingScroll.crossSell !== null) {
      targets.crossSell.scrollLeft = pendingScroll.crossSell;
    }
    pendingScroll = null;
  }

  function addCrossSellItem(button) {
    var card = button.closest('.cart-drawer__cross-sell-card');
    var variantInput = card && card.querySelector('[data-cross-sell-variant-select]');
    var cartDrawer = getCartDrawer();
    if (!card || !variantInput || !variantInput.value || !cartDrawer) return;

    button.setAttribute('aria-disabled', 'true');
    button.classList.add('loading');

    captureScroll();

    var formData = new FormData();
    formData.append('id', variantInput.value);
    formData.append('quantity', 1);
    formData.append(
      'sections',
      cartDrawer.getSectionsToRender().map(function (section) {
        return section.id;
      })
    );
    formData.append('sections_url', window.location.pathname);

    var config = fetchConfig('javascript');
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    delete config.headers['Content-Type'];
    config.body = formData;

    fetch(routes.cart_add_url, config)
      .then(function (response) {
        return response.json();
      })
      .then(function (response) {
        if (response.status) {
          publish(PUB_SUB_EVENTS.cartError, {
            source: 'cart-drawer-cross-sell',
            productVariantId: variantInput.value,
            errors: response.errors || response.description,
            message: response.message,
          });
          return;
        }
        cartDrawer.renderContents(response);
        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: 'cart-drawer-cross-sell',
          cartData: response,
          variantId: variantInput.value,
        });
      })
      .catch(function () {
        pendingScroll = null;
      });
  }

  document.addEventListener('click', function (evt) {
    var button = evt.target.closest('[data-cross-sell-add]');
    if (!button || button.getAttribute('aria-disabled') === 'true') return;
    addCrossSellItem(button);
  });

  document.addEventListener('click', function (evt) {
    var navButton = evt.target.closest(
      '.cart-drawer__cross-sell-prev, .cart-drawer__cross-sell-next'
    );
    if (!navButton) return;
    var track = document.querySelector('.cart-drawer__cross-sell-track');
    if (!track) return;
    var card = track.querySelector('.cart-drawer__cross-sell-card');
    var step = card ? card.getBoundingClientRect().width + 12 : track.clientWidth * 0.8;
    var direction = navButton.classList.contains('cart-drawer__cross-sell-prev') ? -1 : 1;
    track.scrollBy({ left: step * direction, behavior: 'smooth' });
  });

  function checkShippingBarReached(root) {
    var bar = (root || document).querySelector('.cart-drawer__shipping-bar');
    if (!bar) {
      shippingBarReached = null;
      return;
    }

    var reached = bar.getAttribute('data-reached') === 'true';
    if (shippingBarReached === false && reached === true) {
      bar.classList.remove('cart-drawer__shipping-bar--pulse');
      // Force reflow so the animation class can be re-added and replay.
      void bar.offsetWidth;
      bar.classList.add('cart-drawer__shipping-bar--pulse');
    }
    shippingBarReached = reached;
  }

  var debounceTimer;
  var observer = new MutationObserver(function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var cartDrawerRoot = document.getElementById('CartDrawer');
      checkShippingBarReached(cartDrawerRoot);
      restoreScroll();
    }, 50);
  });

  document.addEventListener('DOMContentLoaded', function () {
    var cartDrawerRoot = document.getElementById('CartDrawer');
    if (!cartDrawerRoot) return;
    checkShippingBarReached(cartDrawerRoot);
    observer.observe(cartDrawerRoot, { childList: true, subtree: true });
  });
})();
