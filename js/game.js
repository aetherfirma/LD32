function main() {
    var renderer, world, textures = {}, surface, light, msg_banner = $("#msg-banner"), time = 0, last_frame, paused = false, length_of_day = 30000;

    function tick() {
        var now  = +new Date, dt = now - last_frame, time_of_day;
        if (!paused) {
            time += dt;
        }
        time_of_day = time % length_of_day;

        requestAnimationFrame(tick);
        light.position.set(
                Math.sin(Math.PI*2*(time_of_day/length_of_day)) * 50,
                0,
                Math.cos(Math.PI*2*(time_of_day/length_of_day)) * 50
        );
        renderer.renderer.render(renderer.scene, renderer.camera);
        last_frame = now;
    }

    var init_pipeline = [
        function () {
            msg_banner.html("Setting up the renderer");
        },
        function () {
            renderer = setup_renderer();
            renderer.camera.position.set(0, -60, 50);
            renderer.camera.lookAt(new THREE.Vector3(0,0,-15));
            light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(5000,5000,5000);
            renderer.scene.add(light);
            renderer.scene.add(new THREE.AmbientLight(0x333333));
            msg_banner.html("Generating world");
        },
        function () {
            world = generate_heightmap(1024);
            msg_banner.html("Generating world map");
        },
        function () {
            textures.diff = generate_diff_map(world);
            msg_banner.html("Calculating height map");
        },
        function () {
            textures.bump = generate_bump_map(world);
            msg_banner.html("Making the sea shiny");
        },
        function () {
            textures.spec = generate_spec_map(world);
            msg_banner.html("Creating world geometry");
        },
        function () {
            surface = create_render_surface(textures, world);
            renderer.scene.add(surface);
            msg_banner.hide();
        },
        function () {
            document.body.appendChild(renderer.renderer.domElement);
            last_frame = +new Date;
            tick();
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
