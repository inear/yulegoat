uniform float time;

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
  vRotation = time+rotation*3.0;

  vec3 mid = vec3(0.5, 0.5, 0.0);
  //vec3 rpos = rotateAngleAxis(start+time, vec3(mod(start,16.0), -8.0+mod(start,15.0), 1.0), position - mid) + mid;
  vec3 rpos = position;//rotateAngleAxis(clamp(start+time,0.0,2.0), vec3(0.0, 1.0, 0.0), position - mid) + mid;


  vec4 fpos = vec4( mix(position,rpos,clamp(time,0.0,0.7)), 1.0 );

  //fpos.z += ((sin(start+time)))*1.2;



  //pos.y += 5.0*sin(time*2.0);
  float offsetTarget = 3.0;

  vColor.rbg = vec3(offsetTarget-fpos.y);

  vec4 mvPosition = modelViewMatrix * fpos;
  float distFromSpawnPoint = (mod(time+start,0.9)*2.0)*offsetTarget;
  lifePosition = distFromSpawnPoint/offsetTarget;
  mvPosition.y += distFromSpawnPoint;

  gl_PointSize = size * (lifePosition*lifePosition*2.0);

  gl_Position = projectionMatrix * mvPosition;


}
