import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";

let camera, scene, renderer;

async function initYouWorldThreeAR() {
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

  await YouWorld.registerScene({
    sceneId: "city-block-002",
    mode: "AR",
    engine: "three.js",
    device: "DESKTOP_OR_MOBILE"
  });

  renderer.setAnimationLoop((t, frame) => {
    YouWorld.renderSceneView("city-block-002", { frame, renderer, scene, camera });
    renderer.render(scene, camera);
  });
}

initYouWorldThreeAR();
