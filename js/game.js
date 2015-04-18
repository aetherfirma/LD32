function main() {
    var renderer = setup_renderer(),
        world = generate_heightmap(128),
        textures = generate_texture_maps(world),
        surface = create_render_surface(textures),
        light;

    renderer.camera.position.set(0, -60, 50);
    renderer.camera.lookAt(new THREE.Vector3(0,0,-15));

    renderer.scene.add(surface);

    light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(50,50,50);
    renderer.scene.add(light);
    renderer.scene.add(new THREE.AmbientLight(0x202020));

    document.body.appendChild(renderer.renderer.domElement);

    function animate() {
        requestAnimationFrame(animate);
        //light.position.set(
        //        Math.sin(Math.PI*2/24*(time-4)) * 50,
        //        50,
        //        Math.cos(Math.PI*2/24*(time-4)) * 50
        //);
        renderer.renderer.render(renderer.scene, renderer.camera);
    }
    animate();
}
