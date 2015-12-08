uniform vec3 color;
uniform float effect;
uniform float time;
uniform sampler2D texture;
varying float lifePosition;

varying vec2 vOffset;
varying float vRotation;
varying vec3 vColor;


void main() {

  vec2 coord = gl_PointCoord;

  vec2 offset = vOffset;

  vec2 repeat = vec2(0.25,0.25);
  vec2 uv = vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y );
  vec4 tex = texture2D( texture, uv * repeat + offset );

  gl_FragColor = vec4( color * vColor, mix((1.9-lifePosition)*effect,0.5*effect,(1.0-lifePosition)/1.0*effect) );

  gl_FragColor = gl_FragColor * tex;

}
