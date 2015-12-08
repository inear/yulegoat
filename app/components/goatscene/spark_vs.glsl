uniform float time;
uniform float effect;

attribute vec2 offset;
varying vec2 vOffset;

attribute float size;
attribute float rotation;
attribute float start;
attribute vec3 customColor;

varying float vRotation;
varying vec3 vColor;
varying float lifePosition;

// rotateAngleAxisMatrix returns the mat3 rotation matrix
// for given angle and axis.
mat3 rotateAngleAxisMatrix(float angle, vec3 axis) {
  float c = cos(angle);
  float s = sin(angle);
  float t = 1.0 - c;
  axis = normalize(axis);
  float x = axis.x, y = axis.y, z = axis.z;
  return mat3(
    t*x*x + c,    t*x*y + s*z,  t*x*z - s*y,
    t*x*y - s*z,  t*y*y + c,    t*y*z + s*x,
    t*x*z + s*y,  t*y*z - s*x,  t*z*z + c
  );
}

vec3 rotateAngleAxis(float angle, vec3 axis, vec3 v) {
  return rotateAngleAxisMatrix(angle, axis) * v;
}


void main() {

  vColor = customColor;
  vOffset = offset;

  vec3 mid = vec3(position.x+2.0, 12.5, position.z+2.0);
  //vec3 rpos = rotateAngleAxis(start+time, vec3(mod(start,16.0), -8.0+mod(start,15.0), 1.0), position - mid) + mid;
  vec3 rpos = rotateAngleAxis(start+time*12.0*rotation*effect, vec3(0.0, 0.0, 1.0), position - mid) + mid;
  //vec3 rpos = position.xyz;

  //vec4 fpos = vec4(rpos,1.0);//vec4( mix(position,rpos,0.5), 1.0 );
  vec4 fpos = vec4( mix(position,rpos,position.y*0.1), 1.0 );

  //pos.y += 5.0*sin(time*2.0);
  float offsetTarget = 4.0*(mod(time,0.001)+0.5);

  vColor.rbg = vColor.rbg*vec3(offsetTarget-(fpos.y-5.0));

  vec4 mvPosition = modelViewMatrix * fpos;
  float distFromSpawnPoint = (mod(time+start,0.5)*2.0)*offsetTarget;
  lifePosition = clamp(distFromSpawnPoint/offsetTarget,0.0,1.0);
  mvPosition.y += distFromSpawnPoint;

  mvPosition.y += lifePosition*15.0;

  gl_PointSize = size * (lifePosition*4.0);

  gl_Position = projectionMatrix * mvPosition;

  vRotation = (time+rotation);

}
