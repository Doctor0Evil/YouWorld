import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";

let camera, scene, renderer;

async function initYouWorldAR() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  await YouWorld.registerScene({
    sceneId: "city-block-001",
    mode: "AR",
    engine: "three.js"
  });

  renderer.setAnimationLoop(renderLoop);
}

function renderLoop(timestamp, frame) {
  YouWorld.renderSceneView("city-block-001", { frame, renderer, scene, camera });
  renderer.render(scene, camera);
}

initYouWorldAR();
