uniform vec3 color;
uniform float time;
uniform sampler2D texture;
varying float lifePosition;

varying vec2 vOffset;
varying float vRotation;
varying vec3 vColor;


void main() {

  vec2 coord = gl_PointCoord;




  /*float sin_factor = sin(time+vRotation*2.5)*3.0;
  float cos_factor = cos(time+vRotation*2.5)*3.0;
  coord = (coord - 0.5) * mat2(cos_factor, sin_factor, -sin_factor, cos_factor);
  coord += 0.5;
*/
  vec2 repeat = vec2(0.25,0.25);
  vec2 uv = vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y );
  vec4 tex = texture2D( texture, uv * repeat + vOffset );

  gl_FragColor = vec4( color * vColor, mix((1.0-lifePosition),0.0,(1.0-lifePosition)/1.0) );

  gl_FragColor = gl_FragColor * tex;// texture2D( texture, gl_PointCoord );
  //gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );

}
