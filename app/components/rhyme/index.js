'use strict';

require('gsap');

var fs = require('fs');
var Vue = require('vue');

var TweenMax = require('tweenmax');
var qs = require('nk-query-string');

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
    this.quotesEl = this.$el.querySelector('.js-quotes');
    this.nextBtnEl = this.$el.querySelector('.js-next');
    this.againBtnEl = this.$el.querySelector('.js-playagain');

    if( qs('step') ) {
      this.currentQuote = parseInt(qs('step'));
    }
  },

  data: function() {
    return {
      currentQuote: 1
    };
  },

  components: {

  },

  methods: {
    next: function( evt ){

      evt.preventDefault();

      var self = this;

      TweenMax.to(this.nextBtnEl,0.2,{opacity:0, onComplete:function(){
        self.nextBtnEl.classList.add('inactive');
      }});


      if( this.currentQuote < 8) {
        //hide previous

        TweenMax.to(this.quotesEl,0.2,{opacity:0, force3D:true, onComplete:function(){

          //hide old
          self.$el.querySelector('.js-quote-8').classList.add('inactive');

          if( self.currentQuote > 0) {
            self.$el.querySelector('.js-quote-' + self.currentQuote).classList.add('inactive');
          }
          else {
            self.$el.querySelector('.js-quote-1').classList.remove('inactive');
          }

          self.currentQuote++;

          self.pub('step', self.currentQuote);

          self.$el.querySelector('.js-quote-' + self.currentQuote).classList.remove('inactive');

          TweenMax.to(self.quotesEl,0.2,{ overwrite:0, delay:2, opacity:1, onComplete:function(){

          }});
        }});

        setTimeout( function(){
          //show next
          if( self.currentQuote === 8){
            self.nextBtnEl.classList.add('inactive');
            self.againBtnEl.classList.remove('inactive');
          }
          else {
            self.nextBtnEl.innerText = "next";
            self.nextBtnEl.classList.remove('inactive');
              TweenMax.to(self.nextBtnEl,0.2,{overwrite:0,  opacity:1, onComplete:function(){

            }});

          }
        },2000);

      }

    },
    playAgain: function( evt ){

      evt.preventDefault();
      this.currentQuote = 0;
      this.next(evt);

      this.nextBtnEl.classList.remove('inactive');
      this.againBtnEl.classList.add('inactive');


    }
  },

  detached: function() {
    console.log('detached');
    //this.pub('backbutton:hide');
  }
};
