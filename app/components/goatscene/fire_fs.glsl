uniform vec3 color;
uniform float time;
uniform sampler2D texture;
varying float lifePosition;

varying float vRotation;
varying vec3 vColor;


void main() {

  gl_FragColor = vec4( color * vColor, clamp(sin(3.14*lifePosition),0.0,0.3) );

  vec2 coord = gl_PointCoord;
  float sin_factor = sin(vRotation/2.0);
  float cos_factor = cos(vRotation/2.0);
  coord = (coord - 0.5) * mat2(cos_factor, sin_factor, -sin_factor, cos_factor);
  coord += 0.5;



  gl_FragColor = gl_FragColor * texture2D( texture,  coord);// texture2D( texture, gl_PointCoord );
  //gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );

}
