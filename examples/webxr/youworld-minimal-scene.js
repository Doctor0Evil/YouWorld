async function startYouWorldAR() {
  if (!navigator.xr) throw new Error("WebXR not available");

  const session = await navigator.xr.requestSession("immersive-ar", {
    requiredFeatures: ["hit-test"]
  });

  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  const gl = canvas.getContext("webgl", { xrCompatible: true });

  const refSpace = await session.requestReferenceSpace("local");
  session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

  // Register or attach this WebXR experience as a YouWorld scene
  await YouWorld.registerScene({
    sceneId: "city-block-001",
    mode: "AR",
    capabilities: ["hit-test", "surface-placement"]
  });

  const onXRFrame = (time, frame) => {
    session.requestAnimationFrame(onXRFrame);
    const pose = frame.getViewerPose(refSpace);
    if (!pose) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const view of pose.views) {
      const vp = session.renderState.baseLayer.getViewport(view);
      gl.viewport(vp.x, vp.y, vp.width, vp.height);
      YouWorld.renderSceneView("city-block-001", view, refSpace, time);
    }
  };

  session.requestAnimationFrame(onXRFrame);
}
