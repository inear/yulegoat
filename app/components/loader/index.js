'use strict';

var fs = require('fs');
var _ = require('lodash');
var TweenMax = require('tweenmax');
var Vue = require('vue');

module.exports = {
  replace: true,
  template: fs.readFileSync(__dirname + '/template.html', 'utf8'),
  mixins: [
    require('vue-mediator-mixin')
  ],

  created: function() {
    _.bindAll(
      this,
      'onLoaderShow',
      'onLoaderHide',
      'onResize'
    );

    this.sub('loader:show', this.onLoaderShow);
    this.sub('loader:hide', this.onLoaderHide);
  },

  ready: function() {
    this.showTime = 0;

  },

  attached: function() {
    Vue.nextTick(function() {
      window.addEventListener('resize', this.onResize);
      this.onResize();
    }, this);
  },

  data: function() {
    return {
      show: true
    };
  },

  beforeDestroy: function() {
    window.removeEventListener('resize', this.onResize);
  },

  methods: {
    onResize: function() {

    },

    onLoaderShow: function(route) {
      this.show = true;

      Vue.nextTick(function(){
        this.onResize();
      }, this);

    },

    onLoaderHide: function() {

     var self = this;
      setTimeout(function() {
        self.show = false;
      }, 500);


    }
  }
};
