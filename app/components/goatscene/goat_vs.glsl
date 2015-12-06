#define PHONG
varying vec3 vViewPosition;
attribute float displacement;
attribute vec3 position2;
varying float v_displaced;
uniform float time;

varying vec3 vNormal;

#define PI 3.14159
#define PI2 6.28318
#define RECIPROCAL_PI2 0.15915494
#define LOG2 1.442695
#define EPSILON 1e-6

#define saturate(a) clamp( a, 0.0, 1.0 )
#define whiteCompliment(a) ( 1.0 - saturate( a ) )

vec3 transformDirection( in vec3 normal, in mat4 matrix ) {

  return normalize( ( matrix * vec4( normal, 0.0 ) ).xyz );

}

vec3 inverseTransformDirection( in vec3 normal, in mat4 matrix ) {

  return normalize( ( vec4( normal, 0.0 ) * matrix ).xyz );

}

vec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {

  float distance = dot( planeNormal, point - pointOnPlane );

  return - distance * planeNormal + point;

}

float sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {

  return sign( dot( point - pointOnPlane, planeNormal ) );

}

vec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {

  return lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;

}

float calcLightAttenuation( float lightDistance, float cutoffDistance, float decayExponent ) {

  if ( decayExponent > 0.0 ) {

    return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );

  }

  return 1.0;

}

vec3 F_Schlick( in vec3 specularColor, in float dotLH ) {


  float fresnel = exp2( ( -5.55437 * dotLH - 6.98316 ) * dotLH );

  return ( 1.0 - specularColor ) * fresnel + specularColor;

}

float G_BlinnPhong_Implicit( /* in float dotNL, in float dotNV */ ) {


  return 0.25;

}

float D_BlinnPhong( in float shininess, in float dotNH ) {


  return ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );

}

vec3 BRDF_BlinnPhong( in vec3 specularColor, in float shininess, in vec3 normal, in vec3 lightDir, in vec3 viewDir ) {

  vec3 halfDir = normalize( lightDir + viewDir );

  float dotNH = saturate( dot( normal, halfDir ) );
  float dotLH = saturate( dot( lightDir, halfDir ) );

  vec3 F = F_Schlick( specularColor, dotLH );

  float G = G_BlinnPhong_Implicit( /* dotNL, dotNV */ );

  float D = D_BlinnPhong( shininess, dotNH );

  return F * G * D;

}

vec3 inputToLinear( in vec3 a ) {

  #ifdef GAMMA_INPUT

    return pow( a, vec3( float( GAMMA_FACTOR ) ) );

  #else

    return a;

  #endif

}

vec3 linearToOutput( in vec3 a ) {

  #ifdef GAMMA_OUTPUT

    return pow( a, vec3( 1.0 / float( GAMMA_FACTOR ) ) );

  #else

    return a;

  #endif

}

#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP )

  varying vec2 vUv;
  uniform vec4 offsetRepeat;

#endif

#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )

  attribute vec2 uv2;
  varying vec2 vUv2;

#endif
#ifdef USE_DISPLACEMENTMAP

  uniform sampler2D displacementMap;
  uniform float displacementScale;
  uniform float displacementBias;

#endif

#if defined( USE_ENVMAP ) && ! defined( USE_BUMPMAP ) && ! defined( USE_NORMALMAP ) && ! defined( PHONG )

  varying vec3 vReflect;

  uniform float refractionRatio;

#endif

#if MAX_SPOT_LIGHTS > 0 || defined( USE_ENVMAP )

  varying vec3 vWorldPosition;

#endif

#if MAX_POINT_LIGHTS > 0

  uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];

#endif

#ifdef USE_COLOR

  varying vec3 vColor;

#endif
#ifdef USE_MORPHTARGETS

  #ifndef USE_MORPHNORMALS

  uniform float morphTargetInfluences[ 8 ];

  #else

  uniform float morphTargetInfluences[ 4 ];

  #endif

#endif
#ifdef USE_SKINNING

  uniform mat4 bindMatrix;
  uniform mat4 bindMatrixInverse;

  #ifdef BONE_TEXTURE

    uniform sampler2D boneTexture;
    uniform int boneTextureWidth;
    uniform int boneTextureHeight;

    mat4 getBoneMatrix( const in float i ) {

      float j = i * 4.0;
      float x = mod( j, float( boneTextureWidth ) );
      float y = floor( j / float( boneTextureWidth ) );

      float dx = 1.0 / float( boneTextureWidth );
      float dy = 1.0 / float( boneTextureHeight );

      y = dy * ( y + 0.5 );

      vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
      vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
      vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
      vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );

      mat4 bone = mat4( v1, v2, v3, v4 );

      return bone;

    }

  #else

    uniform mat4 boneGlobalMatrices[ MAX_BONES ];

    mat4 getBoneMatrix( const in float i ) {

      mat4 bone = boneGlobalMatrices[ int(i) ];
      return bone;

    }

  #endif

#endif

#ifdef USE_SHADOWMAP

  uniform float shadowDarkness[ MAX_SHADOWS ];
  uniform mat4 shadowMatrix[ MAX_SHADOWS ];
  varying vec4 vShadowCoord[ MAX_SHADOWS ];

#endif
#ifdef USE_LOGDEPTHBUF

  #ifdef USE_LOGDEPTHBUF_EXT

    varying float vFragDepth;

  #endif

  uniform float logDepthBufFC;

#endif
void main() {
#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP )

  vUv = uv * offsetRepeat.zw + offsetRepeat.xy;

#endif
#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )

  vUv2 = uv2;

#endif
#ifdef USE_COLOR

  vColor.xyz = color.xyz;

#endif

vec3 objectNormal = vec3( normal );


//custom

v_displaced = displacement;

vec3 transformedNormal = normalMatrix * objectNormal;

vec3 transformed = vec3( position );
float amount = time*displacement;
transformed = position*(1.0-amount) + position2*amount;


vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );


gl_Position = projectionMatrix * mvPosition;

vNormal = normalize( transformedNormal );

//gl_Position.y += amount*0.5;
//gl_Position.y += cos(amount)*0.5*amount;

#ifdef USE_LOGDEPTHBUF

  gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

  #ifdef USE_LOGDEPTHBUF_EXT

    vFragDepth = 1.0 + gl_Position.w;

#else

    gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

  #endif

#endif
  vViewPosition = - mvPosition.xyz;
#if defined( USE_ENVMAP ) || defined( PHONG ) || defined( LAMBERT ) || defined ( USE_SHADOWMAP )

  #ifdef USE_SKINNING

    vec4 worldPosition = modelMatrix * skinned;

  #else

    vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );

  #endif

#endif

#if defined( USE_ENVMAP ) && ! defined( USE_BUMPMAP ) && ! defined( USE_NORMALMAP ) && ! defined( PHONG )

  vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );

  vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );

  #ifdef ENVMAP_MODE_REFLECTION

    vReflect = reflect( cameraToVertex, worldNormal );

  #else

    vReflect = refract( cameraToVertex, worldNormal, refractionRatio );

  #endif

#endif

#if MAX_SPOT_LIGHTS > 0 || defined( USE_ENVMAP )

  vWorldPosition = worldPosition.xyz;

#endif

#ifdef USE_SHADOWMAP

  for ( int i = 0; i < MAX_SHADOWS; i ++ ) {

      vShadowCoord[ i ] = shadowMatrix[ i ] * worldPosition;

  }

#endif
}


