'use strict';

var _ = require('lodash');
var fs = require('fs');
var THREE = require('three');
var WAGNER = require('wagner');
var raf = require('raf');
var TimelineMax = require('timelinemax');
var TweenMax = require('tweenmax');
var Vue = require('vue');
var detector = require('../../lib/detector');
var dat = require('dat-gui');
var mainSceneData = require('./mainscene.json');
var goatData = require('./goatscene.json');

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

    this.initGUI();

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

      var total = 4;
      var loaded = 0;
      var loader = new THREE.TextureLoader();

      var images = [
        { id:'snow', url:'images/snow.jpg'},
        { id:'snowNormal', url:'images/snow2.jpg'},
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
        Vue.nextTick(function() {
          this.$dispatch('load-complete');
          this.$dispatch('init-complete');
        }, this);

    },

    initGUI: function(){

      this.settings = {
        goatBurned: 0.0001,
        fireIntensity: 0.90,

        zoomBlurStrength:0.13001,
        bloomBlur:2.001,
        brightness:0.9,
        contrast:0.9
      };

      var gui = new dat.GUI();
      gui.add(this.settings, 'goatBurned', 0, 4);
      gui.add(this.settings, 'fireIntensity', 0, 2);
      gui.add(this.settings, 'bloomBlur', 0, 5);
      gui.add(this.settings, 'zoomBlurStrength', 0, 1);
      gui.add(this.settings, 'brightness', 0, 4);
      gui.add(this.settings, 'contrast', 0, 3);

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
      };
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
      WAGNER.vertexShadersPath = '/vertex-shaders';
      WAGNER.fragmentShadersPath = '/fragment-shaders';
      WAGNER.assetsPath = '/images';

      this.composer = new WAGNER.Composer( this.renderer, { useRGBA: false } );
      this.composer.setSize(window.innerWidth,window.innerHeight);
      this.bloomPass = new WAGNER.MultiPassBloomPass();
      this.bloomPass.params.blurAmount = this.settings.blurAmount;
      this.bloomPass.params.applyZoomBlur = true;
      this.bloomPass.params.zoomBlurCenter = new THREE.Vector2( 0,1 );
      this.bloomPass.brightnessContrastPass.params.brightness = 1;
      this.bloomPass.brightnessContrastPass.params.contrast = 1;

      this.vignettePass = new WAGNER.VignettePass();
      this.vignettePass.params.amount = 0.7;


      this.initGoat();

      this.initFence();


      //ground
      var plane = new THREE.Mesh(
        new THREE.PlaneGeometry(400,400,2,2),
        new THREE.MeshLambertMaterial({
          map:this.textureLib.snow,
          normalMap:this.textureLib.snowNormal,
          color:0x777799,
          fog:true
        })
      );
      this.goat.add(plane);
      plane.rotation.x = Math.PI*0.5;

      this.initWoodenFrame();
      this.initLights();
      this.createSceneObjects();
      this.startFireParticleEngine();
      this.startSparkParticleEngine();

      //camera rotation
      this.focusPoint = this.goat.position.clone();
      this.focusPoint.y += 5;

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


      this.start();



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

        if( Math.random() > 0.97 && goat1data.data.attributes.position.array[(i*3+1)] < 5 ) {
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
      var loader = new THREE.ObjectLoader();
      var mainSceneParsed = loader.parse(mainSceneData);

      var frame = mainSceneParsed.children[1];
      frame.material = new THREE.MeshLambertMaterial({color:0x444400});
      frame.castShadow = true;
      //matrix.fromArray( data.object.children[1].matrix );
      //matrix.decompose( goat.position, goat.quaternion, goat.scale );
      this.mainContainer.add(frame);
    },


    initWoodenFrame: function(){
      //wooden frame
      var loader = new THREE.ObjectLoader();
      var mainSceneParsed = loader.parse(mainSceneData);

      var frame = mainSceneParsed.children[2];
      frame.material = new THREE.MeshLambertMaterial({color:0x8e7923});
      //frame.castShadow = true;
      //matrix.fromArray( data.object.children[1].matrix );
      //matrix.decompose( goat.position, goat.quaternion, goat.scale );
      this.mainContainer.add(frame);
    },

    initLights: function(){
      var light = new THREE.PointLight(0xffffff, 1.2, 10);
      light.position.copy(this.goat.position);
      light.position.y += 2;
      light.position.z += 1;

      this.mainContainer.add(light);



      light = new THREE.DirectionalLight(0xffffff, 0.7);
      light.position.set(100, 400, -100);
      this.scene.add(light);

      //light = new THREE.AmbientLight(0x222222, 0.2);
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

      //buildingMat = new THREE.MeshPhongMaterial({map:facadeTexture, specularMap: facadeSpecTexture});

      //var uniformClone = THREE.UniformsUtils.clone( uniforms );

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

      //this.scene.rotation.y = (this.mouse2d.x+1)/2*3 + Math.PI*0.5;
      //this.particleSystem.rotation.y = (this.mouse2d.x+1)/2*3;
      //this.sparkParticleSystem.rotation.y = (this.mouse2d.x+1)/2*3;

      this.focusPoint.y += ((7+this.mouse2d.y*8)-this.focusPoint.y)*0.1;

      this.camera.position.x += ((this.mouse2d.x*4+6)-this.camera.position.x )*0.1;
      this.camera.lookAt(this.focusPoint);

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
      this.composer.pass(this.bloomPass);
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
