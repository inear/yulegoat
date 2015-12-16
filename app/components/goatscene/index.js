'use strict';

var _ = require('lodash');
var fs = require('fs');
var THREE = require('three');
var WAGNER = require('wagner');
var raf = require('raf');
var TweenMax = require('tweenmax');
var Vue = require('vue');
var detector = require('../../lib/detector');
var dat = require('dat-gui');
var mainSceneData = require('./mainscene.json');
var goatData = require('./goatscene.json');
var qs = require('nk-query-string');
var Howl = require('howler').Howl;

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
    this.lowPerformance = detector.browsers.lowPerformance();
  },

  compiled: function() {

    //this.initLoader();
    //TweenMax.delayedCall(3, this.showLoader.bind(this));

    this.initGUI();

    console.log("compiled");

    _.bindAll(this,
      'onPreload',
      'render',
      'onMouseMove',
      'onResize',
      'onStep'
    );

    this.sub('preload:goatscene', this.onPreload);
    this.sub('step', this.onStep);

  },

  attached: function() {

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

    this.threeEl = document.querySelector('.Goat_three');
    this.mouse2d = new THREE.Vector2();


    this.fireSound = new Howl({
      urls: ['audio/fire.mp3', 'audio/fire.ogg'],
      autoplay: true,
      loop: true,
      volume: 0,
      onend: function() {

      }
    });

    document.addEventListener('mousemove', this.onMouseMove, false);

    Vue.nextTick(function() {
      //this.start();
    }.bind(this));

  },

  methods: {

    loadTextures: function(){

      var total = 4;

      var loader = new THREE.TextureLoader();

      var images = [

        { id:'groundNormal', url:'images/snow-normal.jpg'},
        { id:'groundShadows', url:'images/ground-shadows2.jpg'},
        { id:'goatMap', url:'images/bock_map.jpg'},
        { id:'fireTexture', url:'images/fire.png'},
        { id:'sparkTexture', url:'images/sparks.png'},
        { id:'goatNormalMap', url:'images/bock_normal.jpg'},
        { id:'facade', url:'images/facade2.jpg'},
        { id:'facadeSpec', url:'images/facade-spec.jpg'}

      ];

      var scope = this;
      var index = -1;

      this.textureLib = [];

      function loadNext(){
        index++;
        var item = images[index];

        if( !item ) {
          scope.loadSky();

          return;
        }

        loader.load( item.url, function( value){

          scope.textureLib[item.id] = value;

          loadNext();

        });
      }

      loadNext();

    },

    onPreload: function() {
      console.log("onPreload");

        //var self = this;


    },

    initGUI: function(){

      this.settings = {
        goatBurned: 0.0001,
        fireIntensity: 0.90,

        zoomBlurStrength:0.13001,
        bloomBlur:2.001
      };

      return;

      var gui = new dat.GUI();
      gui.add(this.settings, 'goatBurned', 0, 4);
      gui.add(this.settings, 'fireIntensity', 0, 2);
      gui.add(this.settings, 'bloomBlur', 0, 5);
      gui.add(this.settings, 'zoomBlurStrength', 0, 1);

    },

    loadSky: function(){
      var path = "images/dark/";
      var format = '.jpg';
      var urls = [
          path + 'posz' + format, path + 'negz' + format,
          path + 'posy' + format, path + 'negy' + format,
          path + 'posx' + format, path + 'negx' + format
        ];

      var loader = new THREE.CubeTextureLoader();
      var texture = loader.load( urls, onLoad );

      var self = this;
      function onLoad(){
        self.textureLib.sky = texture;
        self.init3D();
      }
    },


    start: function() {

      this.isRunning = true;

      if( qs('step') ) {
        this.onStep(parseInt(qs('step'),10));
      }
      else {
        this.onStep(1);
      }

      this.render();
      this.onResize();

    },

    onMouseMove: function(event) {
      this.mouse2d.x = (event.clientX / this.size.w) * 2 - 1;
      this.mouse2d.y = -(event.clientY / this.size.h) * 2 + 1;
    },

    initCameraPositions: function(){
      this.currentStep = 0;
      this.cameraUpdateFunctions = [];

      this.cameraDataDict = Object.create(null);

      this.focusPoint = new THREE.Vector3();

      //default
      this.cameraDataDict[0] = {
        pos: new THREE.Vector3(-10,1,-8),
        target: new THREE.Vector3(0,5,0)
      };

      //step 1
      this.cameraDataDict[1] = {
        pos: new THREE.Vector3(-4,3,-10),
        target: new THREE.Vector3(-4,0,-8)
      };

      this.focusPoint.copy(this.cameraDataDict[1].target);

      this.cameraUpdateFunctions[1] = function(){
        this.camera.position.copy(this.cameraDataDict[1].pos);
        this.focusPoint.y += ((this.cameraDataDict[1].target.y+this.mouse2d.y*1.2)-this.focusPoint.y)*0.1;
        this.focusPoint.z = this.cameraDataDict[1].target.z;
        this.focusPoint.x += ((this.cameraDataDict[1].target.x+this.mouse2d.x*-0.3)-this.focusPoint.x)*0.1;
        this.camera.lookAt(this.focusPoint);

      };


      //step 2
      this.cameraDataDict[2] = {
        pos: new THREE.Vector3(4,1,10),
        target: new THREE.Vector3(-4,8,-8)
      };

      this.cameraUpdateFunctions[2] = function(){
        this.camera.position.copy(this.cameraDataDict[2].pos);
        this.focusPoint.y += ((this.cameraDataDict[2].target.y+this.mouse2d.y*1.2)-this.focusPoint.y)*0.1;
        this.focusPoint.z = this.cameraDataDict[2].target.z;
        this.focusPoint.x += ((this.cameraDataDict[2].target.x+this.mouse2d.x*0.3)-this.focusPoint.x)*0.1;
        this.camera.lookAt(this.focusPoint);

      };

      //step 4
      this.cameraDataDict[4] = {
        pos: new THREE.Vector3(5,4,0),
        target: new THREE.Vector3(0,12,0)
      };

      this.cameraUpdateFunctions[4] = function(){
        //this.focusPoint.copy(this.cameraDataDict[4].target);
        this.focusPoint.x = this.cameraDataDict[2].target.x;
        this.focusPoint.z = this.cameraDataDict[2].target.z;
        this.focusPoint.y += ((this.cameraDataDict[4].target.y+this.mouse2d.y*1.2)-this.focusPoint.y)*0.1;
        this.camera.position.z = Math.sin(this.uniforms.time.value*0.3)*4+4;
        this.camera.position.x = this.cameraDataDict[4].pos.x;
        this.camera.position.y = this.cameraDataDict[4].pos.y;
        this.camera.lookAt(this.focusPoint);

      };
    },


    onStep: function(step){

      this.currentStep = step;
      this.setCameraFunction(step);

      if( step === 0 || step === 1) {
        this.uniforms.time.value = 0;
        this.settings.goatBurned = 0;
        this.settings.fireIntensity = 0;
      }
      else if( step === 3) {
        TweenMax.to(this.settings,3,{delay:2,fireIntensity:0.1});
      }
      else if( step === 4) {
        TweenMax.to(this.settings,3,{delay:2,fireIntensity:0.5});
        TweenMax.to(this.settings,15,{delay:2, goatBurned:0.5});
      }
      else if( step === 5) {
        TweenMax.to(this.settings,3,{delay:0,fireIntensity:0.8});
        TweenMax.to(this.settings,10,{delay:0, goatBurned:2});
      }
      else if( step === 6) {
        TweenMax.to(this.settings,3,{delay:0,fireIntensity:0.1});
        TweenMax.to(this.settings,1,{delay:0, goatBurned:2});
      }

    },

    setCameraFunction: function(step){

      if( this.cameraUpdateFunctions[step]  ){
        this.renderUpdateFunc = this.cameraUpdateFunctions[step].bind(this);
      }
      else {
        this.renderUpdateFunc = function(){
          this.focusPoint.copy(this.cameraDataDict[0].target);
          this.camera.position.z =  this.cameraDataDict[0].pos.z;
          this.camera.position.x = Math.sin(this.uniforms.time.value*0.3)*4+4;
          this.camera.position.y = 1.3 + Math.sin(this.uniforms.time.value*0.3)*-0.5;
          this.camera.lookAt(this.focusPoint);
        }.bind(this);
      }

    },

    init3D: function() {

      this.scene = new THREE.Scene();

      this.mainContainer = new THREE.Object3D();
      this.mainContainer.rotation.y = Math.PI*0.5;
      this.scene.add(this.mainContainer);

      this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2100);

      //this.scene.add(this.camera);
      this.scene.fog = new THREE.Fog( 0x111122, 0, 200 ) ;
      //matrix.fromArray( mainData.object.children[0].matrix );
      //matrix.decompose( this.camera.position, this.camera.quaternion, this.camera.scale );

      this.camera.position.set(-10,1,-8);


      this.renderer = new THREE.WebGLRenderer({
        alpha: false
      });
      this.renderer.setSize(window.innerWidth - 1, window.innerHeight - 1);
      this.renderer.setClearColor(0x111122,1);
      this.renderer.physicallyBasedShading = true;

      this.threeEl.appendChild(this.renderer.domElement);

      this.gammaInput = true;
      this.gammaOutput = true;

      //post effects
      WAGNER.vertexShadersPath = 'vertex-shaders';
      WAGNER.fragmentShadersPath = 'fragment-shaders';
      WAGNER.assetsPath = 'images';

      this.composer = new WAGNER.Composer( this.renderer, { useRGBA: false } );
      this.composer.setSize(window.innerWidth,window.innerHeight);
      this.bloomPass = new WAGNER.MultiPassBloomPass();
      this.bloomPass.params.blurAmount = this.settings.blurAmount;
      this.bloomPass.params.applyZoomBlur = true;
      this.bloomPass.params.zoomBlurCenter = new THREE.Vector2( 0,1 );

      this.vignettePass = new WAGNER.VignettePass();
      this.vignettePass.params.amount = 0.7;

      var loader = new THREE.ObjectLoader();
      this.mainSceneParsed = loader.parse(mainSceneData);

      this.initGoat();

      this.initFence();
      this.initGround();
      this.initWoodenFrame();
      this.initLights();
      this.createSceneObjects();
      this.startFireParticleEngine();
      this.startSparkParticleEngine();

      //camera rotation

      var shader = THREE.ShaderLib[ "cube" ];
      shader.uniforms[ "tCube" ].value = this.textureLib.sky;


      var material = new THREE.ShaderMaterial( {
          fragmentShader: shader.fragmentShader,
          vertexShader: shader.vertexShader,
          uniforms: shader.uniforms,
          depthWrite: false,
          side: THREE.BackSide

        } );

      //var material = new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.BackSide } );
      var sky = new THREE.Mesh( new THREE.BoxGeometry( 1000, 1000, 1000 ), material );
      this.mainContainer.add( sky );

      this.mainSceneParsed = null;

      this.initCameraPositions();

      this.start();

      Vue.nextTick(function() {
        this.$dispatch('load-complete');
        this.$dispatch('init-complete');
      }, this);

    },

    initGoat: function(){

      var matrix = new THREE.Matrix4();

      var goat1data = goatData.geometries[1];
      var goat2data = goatData.geometries[0];

      var goatGeo = new THREE.BufferGeometry();
      goatGeo.setIndex( new THREE.BufferAttribute( new Uint16Array(goat1data.data.index.array), 1 ) );
      goatGeo.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(goat1data.data.attributes.normal.array), 3 ) );
      goatGeo.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array(goat1data.data.attributes.uv.array), 2 ) );
      goatGeo.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(goat1data.data.attributes.position.array), 3 ) );
      goatGeo.addAttribute( 'position2', new THREE.BufferAttribute( new Float32Array(goat2data.data.attributes.position.array), 3 ) );

      var displacementArray = new Float32Array(goat1data.metadata.position);

      var smallest = 1000;
      for (var i = 0; i < goat1data.metadata.position; i++) {
        smallest = Math.min(smallest, goat1data.data.attributes.position.array[(i*3+1)]);
      }

      for ( i = 0; i < goat1data.metadata.position; i++) {
        displacementArray[i] = 1.3*goat1data.data.attributes.position.array[(i*3+1)]/(smallest);//4*goat1data.data.attributes.normal[i*3]//Math.random();//goatData.metadata.position;
        displacementArray[i] += Math.random()*0.3;

        if( Math.random() > 0.97 && goat1data.data.attributes.position.array[(i*3+1)] < 5) {
          //create paricle spawn point
          this.createSpawnPoint(
            new THREE.Vector3(goat1data.data.attributes.position.array[(i*3)],
            goat1data.data.attributes.position.array[(i*3+1)],
            goat1data.data.attributes.position.array[(i*3+2)])
          );
        }

        if( Math.random() > 0.98 && goat1data.data.attributes.position.array[(i*3+1)] < 5 ) {
          //create paricle spawn point
          this.createSparkSpawnPoint(
            new THREE.Vector3(goat1data.data.attributes.position.array[(i*3)],
            goat1data.data.attributes.position.array[(i*3+1)],
            goat1data.data.attributes.position.array[(i*3+2)])
          );
        }
      }

      goatGeo.addAttribute( 'displacement', new THREE.BufferAttribute( displacementArray, 1 ) );
      //goatGeo.boundingSphere = new THREE.Sphere( new THREE.Vector3(0,0,0), 100 );
      //goatGeo.uuid = goat1data.uuid;

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

        {
          "emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
          "specular" : { type: "c", value: new THREE.Color( 0x444444) },
          "shininess": { type: "f", value: 10 },
          "goatBurned": { type:"f", value: this.settings.goatBurned},
          "time": {type:"f",value:0}
        }

      ]);

      this.uniforms.map.value = this.textureLib.goatMap;
      this.uniforms.normalMap.value = this.textureLib.goatNormalMap;
      this.uniforms.normalScale.value = new THREE.Vector2(0.4,0.4);

      //var defines = {'USE_MAP':'','DOUBLE_SIDED':''};
      var defines = {'USE_MAP':'','USE_NORMALMAP':''};

      var shaderMaterial = new THREE.ShaderMaterial({
          uniforms: this.uniforms,
          defines: defines,
          vertexShader: require('./goat_vs.glsl'),
          //vertexShader: THREE.ShaderLib.phong.vertexShader,
          fragmentShader: require('./goat_fs.glsl'),
          //fragmentShader: THREE.ShaderLib.phong.fragmentShader,
          lights:true,
          transparent:true,
          derivatives:true
      });

      var goat = this.goat = new THREE.Mesh( goatGeo, shaderMaterial);
      matrix.fromArray( goatData.object.children[1].matrix );
      matrix.decompose( goat.position, goat.quaternion, goat.scale );

      this.mainContainer.add(goat);
    },

    createSpawnPoint: function( pos ){

      pos.y *= -1;

      var showSpawnPoints = false;
      if( showSpawnPoints ) {
        if( !this.spawnHelperGeo ){
          this.spawnHelperGeo = new THREE.SphereGeometry(0.1,2,2);
          this.spawnHelperMaterial = new THREE.MeshBasicMaterial();
        }
        var pointHelper = new THREE.Mesh( this.spawnHelperGeo, this.spawnHelperMaterial);
        pointHelper.position.copy(pos);
        this.scene.add(pointHelper);
      }

      if( !this.fireSpawnPoints){
        this.fireSpawnPoints = [];
      }

      this.fireSpawnPoints.push(pos);

    },

    createSparkSpawnPoint: function( pos ){

      pos.y *= -1;

      if( !this.sparkSpawnPoints){
        this.sparkSpawnPoints = [];
      }

      this.sparkSpawnPoints.push(pos);

    },

    startFireParticleEngine: function(){

      var particles = this.fireSpawnPoints.length;

      this.textureLib.fireTexture.wrapS = this.textureLib.fireTexture.wrapT = THREE.ClampWrapping;

      this.particleUniforms = {
        effect:      { type: "f", value:0 },
        time:      { type: "f", value:0 },
        color:     { type: "c", value: new THREE.Color( 0xffffff ) },
        texture:   { type: "t", value: this.textureLib.fireTexture }

      };

      var particleMaterial = new THREE.ShaderMaterial( {

        uniforms:       this.particleUniforms,
        vertexShader:   require('./fire_vs.glsl'),
        fragmentShader: require('./fire_fs.glsl'),

        blending:       THREE.NormalBlending,
        depthTest:      false,
        transparent:    true
      });

      var geometry = new THREE.BufferGeometry();

      var positions = new Float32Array( particles * 3 );
      var colors = new Float32Array( particles * 3 );
      var sizes = new Float32Array( particles );
      var start = new Float32Array( particles );
      var rotation = new Float32Array( particles );
      var offsets = new Float32Array( particles * 2 );
      var color = new THREE.Color(1,1,1);

      for ( var i = 0, i2 = 0 , i3 = 0; i < particles; i ++, i2 += 2, i3 += 3 ) {

        positions[ i3 + 0 ] = this.fireSpawnPoints[i].x;
        positions[ i3 + 1 ] = this.fireSpawnPoints[i].y;
        positions[ i3 + 2 ] = this.fireSpawnPoints[i].z;

        offsets[i2] = Math.floor( Math.random()*4)/4;
        offsets[i2+1] = Math.floor( Math.random()*4)/4;
        start[i] = Math.random();
        rotation[i] = Math.random()*2-1;

        //color.setHSL( i / particles, 1.0, 0.5 );

        var intensity = Math.floor(Math.random()*3)*0.3;
        colors[ i3 + 0 ] = color.r*intensity;
        colors[ i3 + 1 ] = color.g*intensity;
        colors[ i3 + 2 ] = color.b*intensity;

        sizes[ i ] = 65;
      }

      geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
      geometry.addAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
      geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
      geometry.addAttribute( 'start', new THREE.BufferAttribute( start, 1 ) );
      geometry.addAttribute( 'offset', new THREE.BufferAttribute( offsets, 2 ) );
      geometry.addAttribute( 'rotation', new THREE.BufferAttribute( rotation, 1 ) );

      this.particleSystem = new THREE.Points( geometry, particleMaterial );

      this.scene.add( this.particleSystem );
    },

    startSparkParticleEngine: function(){

      var particles = this.sparkSpawnPoints.length;

      this.sparkParticleUniforms = {
        effect:      { type: "f", value:1 },
        time:      { type: "f", value:0 },
        color:     { type: "c", value: new THREE.Color( 0xffffff ) },
        texture:   { type: "t", value: this.textureLib.sparkTexture }

      };

      var sparkParticleMaterial = new THREE.ShaderMaterial( {

        uniforms:       this.sparkParticleUniforms,
        vertexShader:   require('./spark_vs.glsl'),
        fragmentShader: require('./spark_fs.glsl'),

        blending:       THREE.AdditiveBlending,
        depthTest:      false,
        transparent:    true
      });

      var geometry = new THREE.BufferGeometry();

      var positions = new Float32Array( particles * 3 );
      var colors = new Float32Array( particles * 3 );
      var sizes = new Float32Array( particles );
      var start = new Float32Array( particles );
      var rotation = new Float32Array( particles );
      var offsets = new Float32Array( particles * 2 );
      var color = new THREE.Color(1,1,1);

      for ( var i = 0, i2 = 0 , i3 = 0; i < particles; i ++, i2 += 2, i3 += 3 ) {

        positions[ i3 + 0 ] = this.sparkSpawnPoints[i].x;
        positions[ i3 + 1 ] = this.sparkSpawnPoints[i].y;
        positions[ i3 + 2 ] = this.sparkSpawnPoints[i].z;

        offsets[i2] = Math.floor( Math.random()*4)/4;
        offsets[i2+1] = Math.floor( Math.random()*4)/4;
        start[i] = Math.random();
        rotation[i] = Math.random()*2-1;

        var intensity = Math.random()*0.5+1;
        colors[ i3 + 0 ] = color.r*intensity;
        colors[ i3 + 1 ] = color.g*intensity;
        colors[ i3 + 2 ] = color.b*intensity;

        sizes[ i ] = 5;
      }

      geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
      geometry.addAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
      geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
      geometry.addAttribute( 'start', new THREE.BufferAttribute( start, 1 ) );
      geometry.addAttribute( 'offset', new THREE.BufferAttribute( offsets, 2 ) );
      geometry.addAttribute( 'rotation', new THREE.BufferAttribute( rotation, 1 ) );

      this.sparkParticleSystem = new THREE.Points( geometry, sparkParticleMaterial );

      this.scene.add( this.sparkParticleSystem );
    },


    initFence: function(){
      //wooden frame

      var frame = this.mainSceneParsed.getChildByName("Fence");
      frame.material = new THREE.MeshLambertMaterial({color:0xffffff, side:THREE.DoubleSide});
      this.mainContainer.add(frame);
    },


    initGround: function(){
      //wooden frame
      var ground = this.mainSceneParsed.getChildByName("Ground");

      //ground.material = new THREE.MeshPhongMaterial({color:0xbbe5ff, map:this.textureLib.groundShadows, specular:0xffffff, shininess:90, normalMap: this.textureLib.groundNormal});
      this.textureLib.groundNormal.wrapS = this.textureLib.groundNormal.wrapT = THREE.RepeatWrapping;
      var phongShader = THREE.ShaderLib.phong;

      var uniforms = THREE.UniformsUtils.clone(phongShader.uniforms);

      uniforms.map.value = this.textureLib.groundShadows;
      uniforms.normalMap.value = this.textureLib.groundNormal;
      uniforms.normalScale.value = new THREE.Vector2(-0.4,-0.3);

      uniforms.emissive.value.set(0x333333);
      uniforms.diffuse.value.set(0xffffff);
      uniforms.specular.value.set( 0x442222);


      uniforms.shininess.value = 20;

      uniforms.offsetRepeat.value.set( 0, 0, 1, 1 );

      var vertexShader = [

        "#define PHONG",

        "varying vec3 vViewPosition;",
        "varying vec3 vNormal;",

        THREE.ShaderChunk[ "common" ],
        THREE.ShaderChunk[ "uv_pars_vertex" ],
        THREE.ShaderChunk[ "lights_phong_pars_vertex" ],
        THREE.ShaderChunk[ "color_pars_vertex" ],
        THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ],

        "void main() {",
        THREE.ShaderChunk[ "uv_vertex" ],
        THREE.ShaderChunk[ "color_vertex" ],
        THREE.ShaderChunk[ "beginnormal_vertex" ],
        THREE.ShaderChunk[ "defaultnormal_vertex" ],
        " vNormal = normalize( transformedNormal );",
        THREE.ShaderChunk[ "begin_vertex" ],
        THREE.ShaderChunk[ "project_vertex" ],
        " vViewPosition = -mvPosition.xyz;",
        THREE.ShaderChunk[ "worldpos_vertex" ],
        THREE.ShaderChunk[ "lights_phong_vertex" ],
        "}"

      ].join("\n");

      var fragmentShader = [

        "#define PHONG",

        "uniform vec3 diffuse;",
        "uniform float opacity;",

        "uniform vec3 ambient;",
        "uniform vec3 emissive;",
        "uniform vec3 specular;",
        "uniform float shininess;",

        THREE.ShaderChunk[ "common" ],
        THREE.ShaderChunk[ "color_pars_fragment" ],
        THREE.ShaderChunk[ "uv_pars_fragment" ],
        THREE.ShaderChunk[ "map_pars_fragment" ],
        THREE.ShaderChunk[ "alphamap_pars_fragment" ],
        THREE.ShaderChunk[ "aomap_pars_fragment" ],
        THREE.ShaderChunk[ "lightmap_pars_fragment" ],
        THREE.ShaderChunk[ "emissivemap_pars_fragment" ],
        THREE.ShaderChunk[ "envmap_pars_fragment" ],
        THREE.ShaderChunk[ "fog_pars_fragment" ],
        THREE.ShaderChunk[ "lights_phong_pars_fragment" ],
        THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
        THREE.ShaderChunk[ "bumpmap_pars_fragment" ],
        "#ifdef USE_NORMALMAP\n\n uniform sampler2D normalMap;\n  uniform vec2 normalScale;\n\n\n vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {\n\n    vec3 q0 = dFdx( eye_pos.xyz );\n    vec3 q1 = dFdy( eye_pos.xyz );\n    vec2 st0 = dFdx( vUv.st );\n    vec2 st1 = dFdy( vUv.st );\n\n    vec3 S = normalize( q0 * st1.t - q1 * st0.t );\n    vec3 T = normalize( -q0 * st1.s + q1 * st0.s );\n   vec3 N = normalize( surf_norm );\n\n    vec3 mapN = texture2D( normalMap, vUv*10.0 ).xyz * 2.0 - 1.0;\n    mapN.xy = normalScale * mapN.xy;\n    mat3 tsn = mat3( S, T, N );\n   return normalize( tsn * mapN );\n\n }\n\n#endif\n",
        THREE.ShaderChunk[ "specularmap_pars_fragment" ],
        THREE.ShaderChunk[ "logdepthbuf_pars_fragment" ],

        "void main() {",

        " vec3 outgoingLight = vec3( 0.0 );",
      " vec4 diffuseColor = vec4( diffuse, opacity );",
      " vec3 totalAmbientLight = ambientLightColor;",
      " vec3 totalEmissiveLight = emissive;",
      " vec3 shadowMask = vec3( 1.0 );",

        THREE.ShaderChunk[ "map_fragment" ],
        THREE.ShaderChunk[ "color_fragment" ],
        THREE.ShaderChunk[ "specularmap_fragment" ],
        THREE.ShaderChunk[ "normal_phong_fragment" ],
        THREE.ShaderChunk[ "lights_phong_fragment" ],

        " outgoingLight += diffuseColor.rgb * ( totalDiffuseLight + totalAmbientLight ) + totalSpecularLight + totalEmissiveLight;",


        THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

        THREE.ShaderChunk[ "fog_fragment" ],

        " gl_FragColor = vec4( outgoingLight, diffuseColor.a );",

        "}"

      ].join("\n");

      var defines = {'USE_MAP':'','USE_NORMALMAP':''};

      ground.material= new THREE.ShaderMaterial({
        defines:defines,
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        lights:true,
        derivatives:true,
        fog: true
      });

      this.mainContainer.add(ground);

      var plane = new THREE.Mesh(
        new THREE.PlaneGeometry(400,400,2,2),
        new THREE.MeshLambertMaterial({
          color:0xffffff,
          fog:true
        })
      );
      plane.position.y = -1;
      this.mainContainer.add(plane);
      plane.rotation.x = Math.PI*-0.5;

      var can = this.mainSceneParsed.getChildByName("SpotCan");
      can.material = new THREE.MeshLambertMaterial({color:0x000000});
      this.mainContainer.add(can);
    },

    initWoodenFrame: function(){
      //wooden frame

      var frame = this.mainSceneParsed.getChildByName("wodden_frame");
      frame.material = new THREE.MeshLambertMaterial({color:0x000000});

      this.mainContainer.add(frame);
    },

    initLights: function(){
      var light = new THREE.PointLight(0xffffff, 1.2, 10);
      light.position.copy(this.goat.position);
      light.position.y += 2;
      light.position.z += 1;
      //light.position.x += 1;
      this.mainContainer.add(light);

      this.fireLight = new THREE.PointLight(0xffff00, 1, 100);
      this.fireLight.position.copy(this.goat.position);
      this.mainContainer.add(this.fireLight);


      light = new THREE.DirectionalLight(0xffffff, 0.7);
      light.position.set(1, 4, 1);
      this.scene.add(light);

      light = new THREE.AmbientLight(0x222222, 0.2);
      //this.scene.add(light);

/*
      light = new THREE.SpotLight( 0xffffff, 0.8, 30,10 );
      //var helper = new THREE.SpotLightHelper(light);
      //this.scene.add(helper);
      light.position.copy(this.goat.position);//.add(-300,100,100);
      light.position.y = 30;
      light.position.x = 0;
      //light.rotation.x = 10*Math.PI/180;
      //light.lookAt(this.goat.position);
      light.castShadow = true;
      light.shadowCameraNear = 1;
      light.shadowCameraFar = 200;
      light.shadowCameraFov = 60;
      light.shadowBias = -0.00022;
      light.shadowDarkness = 0.5;
      light.shadowMapWidth = 1024;
      light.shadowMapHeight = 1024;
      this.scene.add(light);*/
    },

    createSceneObjects: function(){

      var b1,b2,h,material;

      this.textureLib.facade.wrapS = this.textureLib.facade.wrapT = THREE.RepeatWrapping;
      this.textureLib.facadeSpec.wrapS = this.textureLib.facadeSpec.wrapT = THREE.RepeatWrapping;

      var phongShader = THREE.ShaderLib.phong;

      var uniforms = THREE.UniformsUtils.clone(phongShader.uniforms);

      uniforms.map.value = this.textureLib.facade;
      uniforms.specularMap.value = this.textureLib.facadeSpec;
      uniforms.diffuse.value.set(0xffffff);
      uniforms.specular.value.set( 0x333333);

      uniforms.shininess.value = 20;

      uniforms.offsetRepeat.value.set( 0, -1, 3, 2 );

      var vertexShader = [

        "#define PHONG",

        "varying vec3 vViewPosition;",
        "varying vec3 vNormal;",

        THREE.ShaderChunk[ "common" ],
        THREE.ShaderChunk[ "uv_pars_vertex" ],
        THREE.ShaderChunk[ "lights_phong_pars_vertex" ],
        THREE.ShaderChunk[ "color_pars_vertex" ],
        THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ],

        "void main() {",
        THREE.ShaderChunk[ "uv_vertex" ],
        THREE.ShaderChunk[ "color_vertex" ],
        THREE.ShaderChunk[ "beginnormal_vertex" ],
        THREE.ShaderChunk[ "defaultnormal_vertex" ],
        " vNormal = normalize( transformedNormal );",
        THREE.ShaderChunk[ "begin_vertex" ],
        THREE.ShaderChunk[ "project_vertex" ],
        " vViewPosition = -mvPosition.xyz;",
        THREE.ShaderChunk[ "worldpos_vertex" ],
        THREE.ShaderChunk[ "lights_phong_vertex" ],
        "}"

      ].join("\n");

      var fragmentShader = [

        "#define PHONG",

        "uniform vec3 diffuse;",
        "uniform float opacity;",

        "uniform vec3 ambient;",
        "uniform vec3 emissive;",
        "uniform vec3 specular;",
        "uniform float shininess;",

        THREE.ShaderChunk[ "common" ],
        THREE.ShaderChunk[ "color_pars_fragment" ],
        THREE.ShaderChunk[ "uv_pars_fragment" ],
        THREE.ShaderChunk[ "map_pars_fragment" ],
        THREE.ShaderChunk[ "alphamap_pars_fragment" ],
        THREE.ShaderChunk[ "aomap_pars_fragment" ],
        THREE.ShaderChunk[ "lightmap_pars_fragment" ],
        THREE.ShaderChunk[ "emissivemap_pars_fragment" ],
        THREE.ShaderChunk[ "envmap_pars_fragment" ],
        THREE.ShaderChunk[ "fog_pars_fragment" ],
        THREE.ShaderChunk[ "lights_phong_pars_fragment" ],
        THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
        THREE.ShaderChunk[ "bumpmap_pars_fragment" ],
        THREE.ShaderChunk[ "normalmap_pars_fragment" ],
        THREE.ShaderChunk[ "specularmap_pars_fragment" ],
        THREE.ShaderChunk[ "logdepthbuf_pars_fragment" ],

        "void main() {",

        " vec3 outgoingLight = vec3( 0.0 );",
      " vec4 diffuseColor = vec4( diffuse, opacity );",
      " vec3 totalAmbientLight = ambientLightColor;",
      " vec3 totalEmissiveLight = emissive;",
      " vec3 shadowMask = vec3( 1.0 );",

        THREE.ShaderChunk[ "map_fragment" ],
        THREE.ShaderChunk[ "color_fragment" ],
        THREE.ShaderChunk[ "specularmap_fragment" ],
        THREE.ShaderChunk[ "normal_phong_fragment" ],
        THREE.ShaderChunk[ "lights_phong_fragment" ],

        " outgoingLight += diffuseColor.rgb * ( totalDiffuseLight + totalAmbientLight ) + totalSpecularLight + totalEmissiveLight;",


        THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

        THREE.ShaderChunk[ "fog_fragment" ],

        " gl_FragColor = vec4( outgoingLight, diffuseColor.a );",

        "gl_FragColor.rgb = gl_FragColor.rgb + specularStrength*vec3(0.95,1.0,0.46)*0.6;",

        "}"

      ].join("\n");

      var defines = {'USE_MAP':'','USE_SPECULARMAP':''};

      var buildingMat = new THREE.ShaderMaterial({
        defines:defines,
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        lights:true,
        derivatives:true,
        fog: true
      });


      this.totalSets = 10;
      var radius = 120;
      for (var i = 0; i < this.totalSets; i++) {

          material = buildingMat;

          h = 18+Math.random()*10;
          b1 = new THREE.Mesh(new THREE.BoxGeometry(60,h,60), material);
          b1.position.x = Math.cos (2 * Math.PI * i/this.totalSets)*radius;
          b1.position.z = Math.sin (2 * Math.PI * i/this.totalSets)*radius;
          b1.position.y = h*0.5;

          b1.rotation.y = -1*Math.PI/180;
          this.mainContainer.add(b1);


      }

    },

    render: function() {

      if (this.isRunning) {
        this.rafId = raf(this.render);
      }

      //this.focusPoint.y += ((7+this.mouse2d.y*8)-this.focusPoint.y)*0.1;
      //this.camera.position.x += ((this.mouse2d.x*4+6)-this.camera.position.x )*0.1;
      this.renderUpdateFunc();

      if( this.fireSound ){
        this.fireSound.volume(this.settings.fireIntensity);
      }

      this.fireLight.intensity = (Math.sin(this.uniforms.time.value*60 + Math.random()*2)*Math.cos(this.uniforms.time.value*3)*Math.sin(this.uniforms.time.value*20)*0.2 + 0.8)*this.settings.fireIntensity;
      this.fireLight.distance = 100*this.fireLight.intensity;

      this.sparkParticleUniforms.time.value += 0.005;//(this.mouse2d.x+1)/2 * 4;
      this.sparkParticleUniforms.effect.value = this.settings.fireIntensity;
      this.particleUniforms.time.value += 0.005;//(this.mouse2d.x+1)/2 * 4;
      this.particleUniforms.effect.value = this.settings.fireIntensity;

      this.uniforms.time.value += 0.005;//(this.mouse2d.x+1)/2 * 4;

      this.uniforms.goatBurned.value = this.settings.goatBurned;

      this.bloomPass.params.zoomBlurStrength = this.settings.zoomBlurStrength;
      this.bloomPass.params.blurAmount = this.settings.bloomBlur;


      this.renderer.autoClearColor = true;
      this.composer.reset();
      this.composer.render(this.scene, this.camera);

      if( !this.lowPerformance ) {
        this.composer.pass(this.bloomPass);
      }

      this.composer.pass(this.vignettePass);
      this.composer.toScreen();


    },


    onResize: function() {

      var w = window.innerWidth;
      var h = window.innerHeight;

      this.size.w = w;
      this.size.h = h;

      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);

    }
  }
};
