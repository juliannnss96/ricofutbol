/**
 * Shopify's native "Talle"/"Talla" filter only checks whether a product HAS a
 * variant with the selected size value -- it ignores whether that specific
 * variant is actually in stock. That means a product can show up as a match
 * for "7.5" even when its 7.5 is sold out, as long as some other size is
 * available. There's no native Shopify setting that fixes this.
 *
 * This re-filters the already-rendered collection/search grid client-side:
 * each product card carries a data-available-sizes list (computed in
 * snippets/card-product.liquid from real variant availability), and after
 * every filter/pagination update we hide cards whose available sizes don't
 * intersect with the currently checked size filter value(s).
 */
(function () {
  function getActiveSizeValues() {
    var checked = document.querySelectorAll(
      '.facets-container input[type="checkbox"][name*="tall" i]:checked, ' +
      '.mobile-facets__wrapper input[type="checkbox"][name*="tall" i]:checked'
    );
    var values = [];
    checked.forEach(function (input) {
      if (values.indexOf(input.value) === -1) values.push(input.value);
    });
    return values;
  }

  function updateProductCount() {
    // Deliberately a no-op. Shopify's server-rendered count reflects the
    // true total across every page for the active filters (it only misses
    // the extra stock-based narrowing this script applies on top). An
    // earlier version of this function tried to show a "more honest" count
    // by counting '#ProductGridContainer .grid__item' -- but that only ever
    // counts the current page's DOM (e.g. 12 of 73 real matches), and since
    // this runs from both a MutationObserver and a 500ms interval, the
    // number changed depending on exactly when it read the DOM mid-render.
    // Showing Shopify's real, stable total -- even though it can be a few
    // products higher than what's actually visible after the stock-based
    // hide -- is far less confusing than a small number that shifts on
    // every reload. See card hiding in applyStockAwareFilter() below for
    // the actual fix to the false-positive problem this file exists for.
  }

  function applyStockAwareFilter() {
    var activeSizes = getActiveSizeValues();
    var cards = document.querySelectorAll('.card-wrapper[data-available-sizes]');

    cards.forEach(function (card) {
      var item = card.closest('.grid__item') || card;

      if (activeSizes.length === 0) {
        item.style.removeProperty('display');
        return;
      }

      var available = card.getAttribute('data-available-sizes').split('||').filter(Boolean);
      var hasMatch = activeSizes.some(function (size) {
        return available.indexOf(size) !== -1;
      });

      item.style.display = hasMatch ? '' : 'none';
    });

    updateProductCount();
  }

  function init() {
    applyStockAwareFilter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-apply whenever the grid or the filter checkboxes change: facets.js
  // replaces #ProductGridContainer on every filter/sort/pagination action,
  // which wipes any state we'd otherwise track, so we just recompute from
  // scratch on any relevant DOM mutation. Cheap no-op when nothing changed.
  if (window.MutationObserver) {
    var observer = new MutationObserver(function () {
      applyStockAwareFilter();
    });
    var target = document.getElementById('ProductGridContainer') || document.body;
    observer.observe(target, { childList: true, subtree: true });
  }

  document.addEventListener('change', function (event) {
    if (event.target.matches('input[type="checkbox"][name*="tall" i]')) {
      // Let facets.js's own listener kick off its fetch first; our
      // MutationObserver will pick up the eventual grid replacement, but we
      // also re-run immediately in case the filter is a client-side no-op.
      setTimeout(applyStockAwareFilter, 0);
    }
  });

  // Safety net for the same unpredictable-DOM-replacement reasons as above.
  setInterval(applyStockAwareFilter, 500);
})();
