'use strict';

require('gsap');

var fs = require('fs');
var Vue = require('vue');
var _ = require('lodash');

module.exports = {
  replace: true,
  template: fs.readFileSync(__dirname + '/template.html', 'utf8'),

  mixins: [
    require('vue-mediator-mixin')
  ],

  created: function() {

  },

  attached: function() {

  },

  ready: function() {

  },

  data: function() {
    return {
      currentQuote:0
    };
  },

  components: {

  },

  methods: {
    next: function(){

      if( this.currentQuote < 8) {
        this.$el.querySelector('.js-quote-' + this.currentQuote).classList.add('inactive');
        this.currentQuote++;
        this.$el.querySelector('.js-quote-' + this.currentQuote).classList.remove('inactive');

        if( this.currentQuote == 8){
          this.$el.querySelector('.js-next').classList.add('inactive');
          this.$el.querySelector('.js-playagain').classList.remove('inactive');
        }
      }

    },
    playAgain: function(){


      this.$el.querySelector('.js-quote-8').classList.add('inactive');
      this.$el.querySelector('.js-next').classList.remove('inactive');
      this.$el.querySelector('.js-playagain').classList.add('inactive');

      this.currentQuote = 0;

      this.next();
    }
  },

  detached: function() {
    console.log('detached');
    //this.pub('backbutton:hide');
  }
};
