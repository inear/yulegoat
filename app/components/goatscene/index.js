'use strict';

var _ = require('lodash');
var fs = require('fs');
var THREE = require('three');
var raf = require('raf');
var TimelineMax = require('timelinemax');
var TweenMax = require('tweenmax');
var Vue = require('vue');
var detector = require('../../lib/detector');

module.exports = {
  replace: true,
  template: fs.readFileSync(__dirname + '/template.html', 'utf8'),

  mixins: [
    require('vue-mediator-mixin')
  ],

  events: {

  },

  data: function() {
    return {

    };
  },

  created: function(){
    this.size = {w: window.innerWidth, h: window.innerHeight};
  },

  compiled: function() {

    //this.initLoader();
    //TweenMax.delayedCall(3, this.showLoader.bind(this));

    console.log("compiled");

    _.bindAll(this,
      'onPreload',
      'render',
      'onMouseMove',
      'onResize'
    );

    this.sub('preload:goatscene', this.onPreload);

  },

  attached: function() {

    console.log("attached");
    window.addEventListener('resize', this.onResize);

    this.loadTextures();
  },

  detached: function() {
    this.isRunning = false;
    if (this.rafId) {
      raf.cancel(this.rafId);
      this.rafId = undefined;
    }

    window.removeEventListener('resize', this.onResize);
    this.threeEl.removeEventListener('mousemove', this.onMouseMove);
  },

  ready: function() {
    console.log("ready");
    this.threeEl = document.querySelector('.Goat_three');
    this.mouse2d = new THREE.Vector2();

    document.addEventListener('mousemove', this.onMouseMove, false);

    Vue.nextTick(function() {
      //this.start();
    }.bind(this));

  },

  methods: {

    loadTextures: function(){

      var total = 2;
      var loaded = 0;
      var loader = new THREE.TextureLoader();

      loader.load( "images/bock_map.jpg", function( value){

        this.goatMap = value;
        //this.uniforms.map.value = value;

        loaded++;

        checkLoadStatus();

       }.bind(this));

      loader.load( "images/bock_normal.jpg", function( value){

        this.goatNormalMap = value;
        //this.uniforms.map.value = value;

        loaded++;

        checkLoadStatus();

       }.bind(this));

      var scope = this;

      function checkLoadStatus(){
        if( loaded === total) {
          scope.init3D();
        }
      }
    },

    onPreload: function() {
      console.log("onPreload");


        //var self = this;
        Vue.nextTick(function() {
          this.$dispatch('load-complete');
          this.$dispatch('init-complete');
        }, this);





    },



    start: function() {


      this.isRunning = true;
      this.render();
      this.onResize();

    },

    onMouseMove: function(event) {
      this.mouse2d.x = (event.clientX / this.size.w) * 2 - 1;
      this.mouse2d.y = -(event.clientY / this.size.h) * 2 + 1;
    },

    init3D: function() {

      var matrix = new THREE.Matrix4();

      this.scene = new THREE.Scene();

      var scene = this.scene;

      var data = require('./goatscene.json');
      var mainData = require('./mainscene.json');

      this.projectionVector = new THREE.Vector3();

      this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1100);
      this.scene.add(this.camera);

      matrix.fromArray( mainData.object.children[0].matrix );
      matrix.decompose( this.camera.position, this.camera.quaternion, this.camera.scale );

      this.camera.position.set(-10,8,-8);

      this.renderer = new THREE.WebGLRenderer({
        alpha: false
      });
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;

      this.threeEl.appendChild(this.renderer.domElement);

      //this.renderer.shadowMapEnabled = true;
      //this.renderer.shadowMapSoft = true;

      this.renderer.setSize(window.innerWidth - 1, window.innerHeight - 1);

      this.gammaInput = true;
      this.gammaOutput = true;

      //var loader = new THREE.ObjectLoader();
      //loader.load( "models/julbock.json", function ( loadedScene ) {
    //;
      //this.scene.fog = new THREE.Fog( 0xffffff, 2000, 10000 );

      /*var goat1 = scene.getObjectByName( 'goat1' );
      scene.remove(goat1);

      var goat2 = scene.getObjectByName( 'goat1' );
*/
      var goatdata = data.geometries[0];
      var goatdata2 = data.geometries[1];

      var goatGeo = new THREE.BufferGeometry();
      goatGeo.setIndex( new THREE.BufferAttribute( new Uint16Array(goatdata.data.index.array), 1 ) );
      goatGeo.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(goatdata.data.attributes.normal.array), 3 ) );
      goatGeo.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array(goatdata.data.attributes.uv.array), 2 ) );
      goatGeo.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(goatdata.data.attributes.position.array), 3 ) );
      goatGeo.addAttribute( 'position2', new THREE.BufferAttribute( new Float32Array(goatdata2.data.attributes.position.array), 3 ) );

      var displacementArray = new Float32Array(goatdata.metadata.position);

      var smallest = 1000;
      for (var i = 0; i < goatdata.metadata.position; i++) {
        smallest = Math.min(smallest, goatdata.data.attributes.position.array[(i*3+1)]);
      }

      for ( i = 0; i < goatdata.metadata.position; i++) {
        displacementArray[i] = 1.3*goatdata.data.attributes.position.array[(i*3+1)]/(smallest);//4*goatdata.data.attributes.normal[i*3]//Math.random();//goatdata.metadata.position;
        displacementArray[i] += Math.random()*0.3;

      }

      goatGeo.addAttribute( 'displacement', new THREE.BufferAttribute( displacementArray, 1 ) );
      goatGeo.boundingSphere = new THREE.Sphere( new THREE.Vector3(0,0,0), 100 );
      goatGeo.uuid = goatdata.uuid;

      this.uniforms = THREE.UniformsUtils.merge( [

        THREE.UniformsLib[ "common" ],
        THREE.UniformsLib[ "aomap" ],
        THREE.UniformsLib[ "lightmap" ],
        THREE.UniformsLib[ "emissivemap" ],
        THREE.UniformsLib[ "bumpmap" ],
        THREE.UniformsLib[ "normalmap" ],
        THREE.UniformsLib[ "displacementmap" ],
        THREE.UniformsLib[ "fog" ],
        THREE.UniformsLib[ "lights" ],
        THREE.UniformsLib[ "shadowmap" ],

        {
          "emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
          "specular" : { type: "c", value: new THREE.Color( 0x111111 ) },
          "shininess": { type: "f", value: 100 },
          "time": {type:"f",value:0}
        }

      ]);

      this.uniforms.map.value = this.goatMap;
      this.uniforms.normalMap.value = this.goatNormalMap;
      this.uniforms.normalScale.value = new THREE.Vector2(0.4,0.4);

      this.uniforms.diffuse.value = new THREE.Color(0xffffff);

      //var defines = {'USE_MAP':'','DOUBLE_SIDED':''};
      var defines = {'USE_MAP':'','USE_NORMALMAP':'','DOUBLE_SIDED':''};

      var shaderMaterial = new THREE.ShaderMaterial({
          uniforms: this.uniforms,
          defines: defines,
          vertexShader: require('./goat_vs.glsl'),
          //vertexShader: THREE.ShaderLib.phong.vertexShader,
          fragmentShader: require('./goat_fs.glsl'),
          //fragmentShader: THREE.ShaderLib.phong.fragmentShader,
          lights:true,
          shading: THREE.SmoothShaded,
          transparent:true,
          derivatives:true
      });

      //shaderMaterial = new THREE.MeshLambertMaterial({map:this.goatMap});
//shaderMaterial = new THREE.MeshPhongMaterial({map:this.goatMap, normalmap:this.goatNormalMap});
      var goat = this.goat = new THREE.Mesh( goatGeo, shaderMaterial);
      matrix.fromArray( data.object.children[1].matrix );
      matrix.decompose( goat.position, goat.quaternion, goat.scale );
      goat.castShadow = true;
      goat.recieveShadow = true;
      this.scene.add(goat);

      var lookAtPos = this.goat.position.clone();
      lookAtPos.y += 1;

      this.camera.lookAt(lookAtPos);

      //wooden frame
      var loader = new THREE.ObjectLoader();
      var mainSceneParsed = loader.parse(mainData);

      var frame = mainSceneParsed.children[1];
      frame.material = new THREE.MeshLambertMaterial({color:0x000000});
      frame.castShadow = true;
      //matrix.fromArray( data.object.children[1].matrix );
      //matrix.decompose( goat.position, goat.quaternion, goat.scale );
      this.scene.add(frame);

      //goat.add( new THREE.Mesh(new THREE.SphereGeometry(6,5,5), new THREE.MeshPhongMaterial({map:this.goatMap,color:0xffffff})));
      var plane = new THREE.Mesh( new THREE.PlaneGeometry(400,400,2,2),new THREE.MeshLambertMaterial({color:0x444444}));
      goat.add(plane);
      plane.rotation.x = Math.PI*0.5;
      plane.receiveShadow = true;
      plane.castShadow = false;
      plane.receiveShadow = true;

      /*var clip = goat.geometry.animations[0];
      mixer = new THREE.AnimationMixer( goat );
      mixer.addAction( new THREE.AnimationAction( clip ) );
*/
      var light = new THREE.PointLight(0xffffff, 0.7);

      light.position.x = -100;
      light.position.y = 60;
      light.position.z = 100;
      //scene.add(light);

      light = new THREE.DirectionalLight(0xffffff, 0.7);
      //light.position.set(-40, 400, 0);
      scene.add(light);

      light = new THREE.AmbientLight(0x222222, 0.2);
      this.scene.add(light);


      var light = new THREE.SpotLight( 0xffffff, 0.8, 10,10 );
      //var helper = new THREE.SpotLightHelper(light);
      //this.scene.add(helper);
      light.position.copy(this.goat.position);//.add(-300,100,100);
      light.position.y = 8;
      light.castShadow = true;
      light.shadowCameraNear = 1;
      light.shadowCameraFar = 20;
      light.shadowCameraFov = 70;
      light.shadowBias = -0.00022;
      light.shadowDarkness = 0.5;
      light.shadowMapWidth = 1024;
      light.shadowMapHeight = 1024;
      this.scene.add(light);

      this.start();

    },

    render: function() {

      if (this.isRunning) {
        this.rafId = raf(this.render);
      }

      //this.goat.morphTargetInfluences[0] = (this.mouse2d.x+1)/2;

      this.uniforms.time.value += 0.01;
      this.uniforms.time.value = (this.mouse2d.x+1)/2 * 4;

      this.renderer.render(this.scene, this.camera);

    },

    onResize: function() {

      var w = window.innerWidth;
      var h = window.innerHeight;

      this.size.w = w;
      this.size.h = h;

      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(w, h);

    }
  }
};
