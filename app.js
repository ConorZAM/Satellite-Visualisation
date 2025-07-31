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
var labelCollection = viewer.scene.primitives.add(new Cesium.LabelCollection());

console.log(`Drawing ${satellites.length} satellites`);

for (let i = 0; i < satellites.length; i++) {
  const satellite = satellites[i];

  pointCollection.add({
    position: satellite.position,
    pixelSize: 4,
    color: Cesium.Color.BLUE
  });

  labelCollection.add({
    position: satellite.position,
    text: satellite.name,
    font: "20px sans-serif",
    showBackground: true,
    // show: false,
    // distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 1000.0),
    eyeOffset: new Cesium.Cartesian3(0, 3.5, 0),
  });
  labelCollection.get(i).show = false;
}

// viewer.camera.flyTo({
//   destination: satellites[1].position,
// });


// In milliseconds!
// const updateInterval = 100;
const GM = 3.98e14;
const labelDistance = 20000000;
const maxLabels = 20;

viewer.clock.shouldAnimate = true;
var lastUpdateTime = viewer.clock.currentTime;
viewer.clock.onTick.addEventListener(updatePositions);

// const requestInterval = setInterval(updatePositions, updateInterval);

function updatePositions() {
  const camPosition = viewer.camera.positionWC;
  let labelCount = 0;
  const dt = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, lastUpdateTime);
  lastUpdateTime = viewer.clock.currentTime;

  for (let i = 0; i < satellites.length; i++) {
    const satellite = satellites[i];
    const positionMagnitude = Cesium.Cartesian3.magnitude(satellite.position);
    const scale = -dt * (GM / (positionMagnitude * positionMagnitude));

    satellite.velocity[0] += scale * satellite.position.x / positionMagnitude;
    satellite.velocity[1] += scale * satellite.position.y / positionMagnitude;
    satellite.velocity[2] += scale * satellite.position.z / positionMagnitude;

    satellite.position.x += dt * satellite.velocity[0];
    satellite.position.y += dt * satellite.velocity[1];
    satellite.position.z += dt * satellite.velocity[2];

    pointCollection.get(i).position = satellite.position;
    if (labelCount < maxLabels && Cesium.Cartesian3.distance(satellite.position, camPosition) <= labelDistance) {
      labelCollection.get(i).position = satellite.position;
      labelCollection.get(i).show = true;
      labelCount++;
    } else {
      labelCollection.get(i).show = false;
    }
  }
}

