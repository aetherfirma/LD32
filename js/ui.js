function setup_renderer() {
    var renderer, projector, camera, scene;

    renderer = new THREE.WebGLRenderer();
    projector = new THREE.Raycaster();
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
        t_specular = new THREE.Texture(textures.spec),
        mesh;
    t_texture.needsUpdate = true;
    t_texture.magFilter = THREE.NearestFilter;
    t_bump.needsUpdate = true;
    t_specular.needsUpdate = true;
    t_specular.magFilter = THREE.NearestFilter;
    mesh = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(100,100),
        new THREE.MeshPhongMaterial({
            map: t_texture,
            bumpMap: t_bump,
            bumpScale: 20,
            specularMap: t_specular,
            specular: new THREE.Color("grey"),
            transparent: true
        })
    );
    mesh.rotation.x = -Math.PI/2;
    return mesh;
}

function add_buildings_to_map(world, buildings, renderer) {
    var b, building, mesh, tex, neutral_tex, government_tex, corp_tex, cult_tex,
        size = 100 / world.size, gcoord;

    world.building_meshes = [];

    for (b in buildings) {
        building = buildings[b];
        if (building.affiliation == NEUTRAL) {
            tex = new THREE.MeshPhongMaterial({color: 0x333333});
        } else if (building.affiliation == GOVERNMENT) {
            tex = new THREE.MeshPhongMaterial({color: 0x0000ff});
        } else if (building.affiliation == CORPORATION) {
            tex = new THREE.MeshPhongMaterial({color: 0x00ff00});
        } else if (building.affiliation == CULT) {
            tex = new THREE.MeshPhongMaterial({color: 0xff0000});
        }
        mesh = new THREE.Mesh(
            new THREE.BoxGeometry(size, size * building.height, size),
            tex
        );
        mesh.building = building;
        gcoord = map_xy_to_world_xy(building.location, size);
        mesh.position.set(gcoord.x, size * building.height / 2, gcoord.y);
        renderer.scene.add(mesh);
        world.building_meshes.push(mesh);
    }
}
