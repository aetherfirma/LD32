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

function create_render_surface(textures) {
    var t_texture = new THREE.Texture(textures.diff),
        t_bump = new THREE.Texture(textures.bump),
        t_specular = new THREE.Texture(textures.spec);
    t_texture.needsUpdate = true;
    t_texture.magFilter = THREE.NearestFilter;
    t_bump.needsUpdate = true;
    t_specular.needsUpdate = true;
    t_specular.magFilter = THREE.NearestFilter;
    return new THREE.Mesh(
        new THREE.PlaneBufferGeometry(100,100),
        new THREE.MeshPhongMaterial({
            map: t_texture,
            bumpMap: t_bump,
            bumpScale: 20,
            specularMap: t_specular,
            specular: new THREE.Color("grey"),
        })
    );
}
