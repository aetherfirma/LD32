function setup_renderer() {
    var renderer, projector, camera, scene;

    renderer = new THREE.WebGLRenderer();
    projector = new THREE.Projector();
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    scene = new THREE.Scene();

    return {
        renderer: renderer,
        projector: projector,
        scene: scene,
        camera: camera
    }
}
