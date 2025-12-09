let xrSession, xrRefSpace, xrViewerSpace, xrHitTestSource, gl;
let reticle = { visible: false, matrix: new Float32Array(16) };

async function startHitTestAR() {
  xrSession = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"] });

  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  gl = canvas.getContext("webgl", { xrCompatible: true });

  xrRefSpace = await xrSession.requestReferenceSpace("local");
  xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });

  // Request hit test source using viewer space
  xrViewerSpace = await xrSession.requestReferenceSpace("viewer");
  xrHitTestSource = await xrSession.requestHitTestSource({ space: xrViewerSpace });

  xrSession.addEventListener("end", () => {
    xrHitTestSource = null;
    reticle.visible = false;
  });

  function onXRFrame(t, frame) {
    xrSession.requestAnimationFrame(onXRFrame);
    const pose = frame.getViewerPose(xrRefSpace);
    if (!pose) return;

    const results = xrHitTestSource ? frame.getHitTestResults(xrHitTestSource) : [];
    if (results.length > 0) {
      const hitPose = results[0].getPose(xrRefSpace);
      reticle.visible = true;
      reticle.matrix.set(hitPose.transform.matrix);
      YouWorld.onReticlePose(hitPose.transform.matrix);
    } else {
      reticle.visible = false;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, xrSession.renderState.baseLayer.framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  xrSession.requestAnimationFrame(onXRFrame);
}
