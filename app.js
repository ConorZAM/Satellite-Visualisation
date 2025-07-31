import "https://cesium.com/downloads/cesiumjs/releases/1.130/Build/Cesium/Cesium.js";


// Try to prevent memory leaks
window.addEventListener('beforeunload', function () {
  if (viewer && viewer.destroy) {
    viewer.destroy(); // releases WebGL context and DOM elements
  }
  clearInterval(requestInterval);
});


Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzMzdhMjIxMS02MDdmLTRhNTMtYmRmZC1jMGU4NmFiZjdiNGQiLCJpZCI6MjIwMzI5LCJpYXQiOjE3NDkzMDEyNjh9.v-fHsJR4ncvFK-ETUid10vofS9OnLAxm0uAC_yj4wmk';

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  timeline: false
  //requestRenderMode: false
});

// Get the satellites from file
const response = await fetch("satelliteData.csv");
const text = await response.text();

const lines = text.trim().split("\n");

// Data is
// Name, launch date, x, y, z, vx, vy, vz (all km and km/s)
const scale = 1000;
var satellites = lines.map(line => {
  const cols = line.split(",");
  return {
    name: cols[0],
    position: new Cesium.Cartesian3(scale * parseFloat(cols[2]), scale * parseFloat(cols[3]), scale * parseFloat(cols[4])),
    velocity: [scale * parseFloat(cols[5]), scale * parseFloat(cols[6]), scale * parseFloat(cols[7])],
  };
});

satellites = satellites.filter(s => s.position.x != 0);

var pointCollection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());

console.log(`Drawing ${satellites.length} satellites`);

for (let i = 0; i < satellites.length; i++) {
  const satellite = satellites[i];

  pointCollection.add({
    position: satellite.position,
    pixelSize: 4,
    color: Cesium.Color.BLUE,
    label: {
      text: satellite.name,
      font: "20px sans-serif",
      showBackground: true,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 1000.0),
      eyeOffset: new Cesium.Cartesian3(0, 3.5, 0),
    }
  });
}

// viewer.camera.flyTo({
//   destination: satellites[1].position,
// });


// In milliseconds!
const dt = 100;
const GM = 3.98e14;
const earthRadius = 6371000;

const requestInterval = setInterval(updatePositions, dt);

function updatePositions() {
  for (let i = 0; i < satellites.length; i++) {
    const satellite = satellites[i];
    const positionMagnitude = Cesium.Cartesian3.magnitude(satellite.position);
    const scale = -dt * (GM / (positionMagnitude * positionMagnitude));
    // const scale = -dt * (GM / ((earthRadius + positionMagnitude) * (earthRadius + positionMagnitude)));

    // console.log(i);
    // console.log(positionMagnitude);
    // console.log(scale);


    satellite.velocity[0] += scale * satellite.position.x / positionMagnitude;
    satellite.velocity[1] += scale * satellite.position.y / positionMagnitude;
    satellite.velocity[2] += scale * satellite.position.z / positionMagnitude;

    satellite.position.x += dt * satellite.velocity[0];
    satellite.position.y += dt * satellite.velocity[1];
    satellite.position.z += dt * satellite.velocity[2];

    pointCollection.get(i).position = satellite.position;
  }
}

