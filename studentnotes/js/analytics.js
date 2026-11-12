/* Loads the NotesPix Google Tag Manager container. */
(function (window, document, scriptTag, dataLayerName, containerId) {
  window[dataLayerName] = window[dataLayerName] || [];
  window[dataLayerName].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var firstScript = document.getElementsByTagName(scriptTag)[0];
  var script = document.createElement(scriptTag);
  var layerParam = dataLayerName !== 'dataLayer' ? '&l=' + dataLayerName : '';
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=' + containerId + layerParam;
  firstScript.parentNode.insertBefore(script, firstScript);
})(window, document, 'script', 'dataLayer', 'GTM-MSJ7TPD4');
