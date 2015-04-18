function main() {
    var renderer, world, textures = {}, surface, light, msg_banner = $("#msg-banner");

    var init_pipeline = [
        function () {
            msg_banner.html("Setting up the renderer");
            renderer = setup_renderer();
            renderer.camera.position.set(0, -60, 50);
            renderer.camera.lookAt(new THREE.Vector3(0,0,-15));
            light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(50,50,50);
            renderer.scene.add(light);
            renderer.scene.add(new THREE.AmbientLight(0x202020));
        },
        function () {
            msg_banner.html("Generating world");
            world = generate_heightmap(512);
        },
        function () {
            msg_banner.html("Generating world map");
            textures.diff = generate_diff_map(world);
        },
        function () {
            msg_banner.html("Calculating height map");
            textures.bump = generate_bump_map(world);
        },
        function () {
            msg_banner.html("Making the sea shiny");
            textures.spec = generate_spec_map(world);
        },
        function () {
            msg_banner.html("Creating world geometry");
            surface = create_render_surface(textures, world);
            renderer.scene.add(surface);
        },
        function () {
            msg_banner.hide();
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
        },
        function () {
        }
    ];

    function call_init_pipeline() {
        var func = init_pipeline.shift();
        if (func === undefined) {
            return;
        }
        func();
        setTimeout(call_init_pipeline, 50);
    }
    call_init_pipeline();
}

main();
