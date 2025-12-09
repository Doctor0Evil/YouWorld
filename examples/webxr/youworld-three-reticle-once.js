import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";

let camera, scene, renderer;
let reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;
let referenceSpace = null;

async function initAR() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.07, 0.09, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x00ffaa })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  renderer.xr.addEventListener("sessionstart", onSessionStart);
  renderer.xr.addEventListener("sessionend", onSessionEnd);

  renderer.setAnimationLoop(onXRFrame);
}

async function onSessionStart() {
  const session = renderer.xr.getSession();
  referenceSpace = await session.requestReferenceSpace("local");

  if (!hitTestSourceRequested) {
    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    hitTestSourceRequested = true;

    session.addEventListener("end", () => {
      hitTestSourceRequested = false;
      hitTestSource = null;
      referenceSpace = null;
      reticle.visible = false;
    });
  }
}

function onSessionEnd() {
  hitTestSourceRequested = false;
  hitTestSource = null;
  referenceSpace = null;
  reticle.visible = false;
}

function onXRFrame(time, frame) {
  const session = renderer.xr.getSession();
  if (!session || !frame || !referenceSpace) {
    renderer.render(scene, camera);
    return;
  }

  const pose = frame.getViewerPose(referenceSpace);
  if (!pose) {
    renderer.render(scene, camera);
    return;
  }

  // Handle hitTestSource results once per frame
  if (hitTestSource) {
    const results = frame.getHitTestResults(hitTestSource);
    if (results.length > 0) {
      const hitPose = results[0].getPose(referenceSpace);
      reticle.visible = true;
      reticle.matrix.fromArray(hitPose.transform.matrix);
      YouWorld.onReticlePose(hitPose.transform.matrix);
    } else {
      reticle.visible = false;
    }
  }

  renderer.render(scene, camera);
}

initAR();
