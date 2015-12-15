'use strict';

require('gsap');

var fs = require('fs');
var Vue = require('vue');
var _ = require('lodash');
var TweenMax = require('tweenmax');

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
  },

  data: function() {
    return {
      currentQuote:1
    };
  },

  components: {

  },

  methods: {
    next: function( evt ){

      evt.preventDefault();

      var self = this;

      TweenMax.to(this.nextBtnEl,0.2,{opacity:0, scale:0.8,force3D:true, onComplete:function(){
        self.nextBtnEl.classList.add('inactive');
      }});


      if( this.currentQuote < 8) {
        //hide previous

        TweenMax.to(this.quotesEl,0.2,{opacity:0, force3D:true, onComplete:function(){

          self.$el.querySelector('.js-quote-' + self.currentQuote).classList.add('inactive');
          self.currentQuote++;
          self.$el.querySelector('.js-quote-' + self.currentQuote).classList.remove('inactive');

          TweenMax.to(self.quotesEl,0.2,{ overwrite:0, delay:2, opacity:1, force3D:true, onComplete:function(){

          }});
        }});


        setTimeout( function(){
          //show next
          if( self.currentQuote == 8){

            self.$el.querySelector('.js-next').classList.add('inactive');
            self.$el.querySelector('.js-playagain').classList.remove('inactive');
          }
          else {
            self.nextBtnEl.innerText = "next";
            self.nextBtnEl.classList.remove('inactive');
              TweenMax.to(self.nextBtnEl,0.2,{overwrite:0,  opacity:1, scale:1,force3D:true, onComplete:function(){

            }});

          }
        },2000);

      }

    },
    playAgain: function( evt ){

      evt.preventDefault();

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
