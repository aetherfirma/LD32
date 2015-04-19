function main() {
    var renderer, world, textures = {}, surface, light, buildings,
        msg_banner = $("#msg-banner"), status_banner = $("#status-banner"),
        time = 0, last_frame, paused = false, length_of_day = 30000, game_speed = 0.5,
        start_year = 2143, start_date = 56, m, next_year, calendar_day,
        camera_location = {x: 0, y: 0}, camera_rotation = Math.PI/2, camera_zoom = 50;

    function current_time() {
        var day, month, year, time_of_day, hour, minutes,
            days_of_the_week = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday"
            ], months_of_the_year = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December"
            ], month_lengths = [
                31,
                28,
                31,
                30,
                31,
                30,
                31,
                31,
                30,
                31,
                30,
                31
            ];

        calendar_day = Math.floor(time / length_of_day);
        day = calendar_day + start_date;
        calendar_day = days_of_the_week[calendar_day % 7];
        year = start_year;
        do {
            next_year = false;
            for (m in month_lengths) {
                if (day > month_lengths[m]) {
                    day -= month_lengths[m];
                    next_year = true;
                } else {
                    next_year = false;
                    break;
                }
            }
            if (next_year) {
                year++;
            }
        } while (next_year);
        month = months_of_the_year[m];

        time_of_day = ((time % length_of_day) / length_of_day) * 24 * 60;
        hour = Math.floor(time_of_day / 60);
        minutes = Math.floor(time_of_day % 60);

        return pad(hour, 2) + ":" + pad(minutes, 2) + " " + calendar_day + " " + day + " " + month + " " + year;
    }

    function tick() {
        var now  = +new Date, dt = now - last_frame, time_of_day, new_camera_vector;
        if (!paused) {
            time += dt * game_speed;
        }
        time_of_day = (time - (length_of_day * 0.55)) % length_of_day;

        requestAnimationFrame(tick);

        light.position.set(
                Math.sin(Math.PI*2*(time_of_day/length_of_day)) * 50,
                Math.cos(Math.PI*2*(time_of_day/length_of_day)) * 50,
                0
        );

        camera_rotation = time / 1000;

        new_camera_vector = new THREE.Vector3(-Math.sin(camera_rotation)* -1.2 *camera_zoom, camera_zoom, Math.cos(camera_rotation)*-1.2*camera_zoom);
        new_camera_vector.x += camera_location.x;
        new_camera_vector.y += camera_location.y;
        renderer.camera.position.set(new_camera_vector.x, new_camera_vector.y, new_camera_vector.z);
        renderer.camera.lookAt(new THREE.Vector3(camera_location.x, (-15/50)*camera_zoom, camera_location.y));


        renderer.renderer.render(renderer.scene, renderer.camera);
        status_banner.text(current_time());
        last_frame = now;
    }

    function mouse_move_handler(evt) {
        msg_banner.hide();
        var x = (evt.pageX / innerWidth) * 2 - 1,
            y = -(evt.pageY / innerHeight) * 2 + 1,
            intersection, intersections, building;
        renderer.projector.setFromCamera({x: x, y: y}, renderer.camera);
        intersections = renderer.projector.intersectObjects(world.building_meshes);
        if (intersections.length > 0) {
            intersection = intersections[0];
            building = intersection.object.building;
        }
        if (building !== undefined) {
            msg_banner.text(building.name + " (" + FACTIONS[building.affiliation] + ")");
            msg_banner.show();
            console.log(building.name, building.affiliation);
        }
    }

    var init_pipeline = [
        function () {
            msg_banner.html("Setting up the renderer");
        },
        function () {
            renderer = setup_renderer();
            light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(5000,5000,5000);
            renderer.scene.add(light);
            //renderer.scene.add(new THREE.AmbientLight(0xffffff));
            renderer.scene.add(new THREE.AmbientLight(0x333333));
            msg_banner.html("Generating world");
        },
        function () {
            world = generate_heightmap(256);
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
            msg_banner.html("Getting city map");
        },
        function () {
            buildings = generate_buildings(world);
            msg_banner.html("Rendering city");
        },
        function () {
            add_buildings_to_map(world, buildings, renderer);
            msg_banner.hide();
        },
        function () {
            document.body.appendChild(renderer.renderer.domElement);
            status_banner.show();
            last_frame = +new Date;
            $("body").mousemove(mouse_move_handler);
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
