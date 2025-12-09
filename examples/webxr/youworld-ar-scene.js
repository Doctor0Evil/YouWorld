async function activateXRWithYouWorldScene() {
  if (!navigator.xr) throw new Error("WebXR not supported");

  const xrSession = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"] });
  const glCanvas = document.createElement("canvas");
  const gl = glCanvas.getContext("webgl", { xrCompatible: true });

  const xrRefSpace = await xrSession.requestReferenceSpace("local");
  xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });

  const youWorldSceneId = "city-block-42";
  const youWorldWidget = await YouWorld.loadWidget({
    sceneId: youWorldSceneId,
    mode: "AR_PANEL"
  });

  const onXRFrame = (time, frame) => {
    xrSession.requestAnimationFrame(onXRFrame);
    const pose = frame.getViewerPose(xrRefSpace);
    if (!pose) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, xrSession.renderState.baseLayer.framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const view of pose.views) {
      const viewport = xrSession.renderState.baseLayer.getViewport(view);
      gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
      youWorldWidget.renderView(view, xrRefSpace, time);
    }
  };

  xrSession.requestAnimationFrame(onXRFrame);
}
