'use strict';

var debug = require('debug');

var qs = require('nk-query-string');
var _ = require('lodash');
var detector = require('./lib/detector');
var Vue = require('vue');

require('ie-console-patch');

Vue.use(require('vue-once'));

if (qs('quality') === 'low') {
  detector.browsers.lowPerformance = function() {
    return true;
  };
}

if (qs('nowebgl')) {
  detector.features.webgl = false;
}

if (process.env.NODE_ENV === 'production') {
  // Disable all debug logs in production.
  debug.disable();
  Vue.config.silent = true;
} else {
  // Enable debug log via query string.
  // Example: ?debug=url,route
  //
  // Here `route` is enabled by default.
  require('enable-debug')(['route'], true);

  Vue.config.debug = true;
}



// Statup the router.
new Vue({
  el: '#app',

  created: function() {
    _.bindAll(this, 'onLoadComplete', 'onInitComplete');
  },

  events: {
    'load-complete': 'onLoadComplete',
    'init-complete': 'onInitComplete'
  },

  mixins: [
    require('vue-mediator-mixin')
  ],

  compiled: function(){
    console.log("app compiled");
  },

  attached: function() {
    console.log("app attached");
    this.pub('loader:show');
    this.pub('preload:goatscene');
  },

  components: {
    'loader': require('./components/loader'),
    'nosupport': require('./components/nosupport'),
    'about': require('./components/about'),
    'goatscene': require('./components/goatscene')
  },

  data: function() {
    return {
      showBackBtn: false
    };
  },

  methods: {
    onLoadComplete: function() {
      console.log('onLoadComplete');
    },

    onInitComplete: function() {

      console.log('onInitComplete');

      setTimeout(function() {
        this.pub('loader:hide');
        //this.$$.top.classList.add('active');
      }.bind(this), 100);
    }
  }
});

function isBrowserSupported() {
  var isSupported = true;

  if (detector.browsers.ie()
      && detector.browsers.ie() < 10) {
    isSupported = false;
  }

  return isSupported;
}

function isOSSupported() {
  var isSupported = true;

  if (detector.os.android
      && parseFloat(detector.os.getAndroidVersion()) < 4.4) {
    isSupported = false;
  }

  if (detector.os.ios
      && detector.os.getOsVersion() < 8) {
    isSupported = false;
  }

  return isSupported;
}

function isFullySupported() {
  return isBrowserSupported() && isOSSupported() && detector.features.webgl;
}
