let xrSession, xrRefSpace, xrViewerSpace, xrHitTestSource, gl;
let reticle = { visible: false, matrix: new Float32Array(16) };

async function startHitTestAR() {
  xrSession = await navigator.xr.requestSession("immersive-ar", {
    requiredFeatures: ["hit-test"]
  });

  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  gl = canvas.getContext("webgl", { xrCompatible: true });

  xrRefSpace = await xrSession.requestReferenceSpace("local");
  xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });

  // Request hit test source using viewer space
  xrViewerSpace = await xrSession.requestReferenceSpace("viewer");
  xrHitTestSource = await xrSession.requestHitTestSource({ space: xrViewerSpace });

  xrSession.requestAnimationFrame(onXRFrame);
}

function onXRFrame(t, frame) {
  xrSession.requestAnimationFrame(onXRFrame);

  const pose = frame.getViewerPose(xrRefSpace);
  if (!pose) return;

  gl.bindFramebuffer(gl.FRAMEBUFFER, xrSession.renderState.baseLayer.framebuffer);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const hitResults = xrHitTestSource ? frame.getHitTestResults(xrHitTestSource) : [];
  if (hitResults.length > 0) {
    const hitPose = hitResults[0].getPose(xrRefSpace);
    reticle.visible = true;
    reticle.matrix.set(hitPose.transform.matrix);
  } else {
    reticle.visible = false;
  }

  for (const view of pose.views) {
    const vp = xrSession.renderState.baseLayer.getViewport(view);
    gl.viewport(vp.x, vp.y, vp.width, vp.height);

    if (reticle.visible) {
      YouWorld.renderReticle(reticle.matrix, view);
    }
  }
}
