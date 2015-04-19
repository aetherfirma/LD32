function main() {
    var renderer, world, textures = {}, surface, light, buildings,
        msg_banner = $("#msg-banner"), status_banner = $("#status-banner"),
        time = 0, last_frame, paused = false, length_of_day = 30000, game_speed = 0.5,
        start_year = 2143, start_date = 56, m, next_year, calendar_day,
        camera_location = {x: 0, y: 0}, camera_rotation = Math.PI/2, camera_zoom = 50,
        left_mouse_down = false, right_mouse_down = false, mouse_down_at,
        mouse_at, mouse_last_at;

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
        var now  = +new Date, dt = now - last_frame, time_of_day, new_camera_vector,
            intersection, intersections, building, mouse_delta, movement_speed, dx, dy, rx, ry;
        if (!paused) {
            time += dt * game_speed;
        }
        time_of_day = (time - (length_of_day * 0.55)) % length_of_day;

        if (mouse_last_at !== undefined) {
            mouse_delta = {x: mouse_last_at.x - mouse_at.x, y: mouse_last_at.y - mouse_at.y};
        }

        requestAnimationFrame(tick);

        msg_banner.hide();
        if (mouse_at !== undefined) {
            renderer.projector.setFromCamera({
                x: (mouse_at.x / innerWidth) * 2 - 1,
                y: -(mouse_at.y / innerHeight) * 2 + 1
            }, renderer.camera);
            intersections = renderer.projector.intersectObjects(world.building_meshes);
            if (intersections.length > 0) {
                intersection = intersections[0];
                building = intersection.object.building;
            }
            if (building !== undefined) {
                msg_banner.text(building.name + " (" + FACTIONS[building.affiliation] + ")");
                msg_banner.show();
            }
        }

        if (mouse_delta !== undefined && left_mouse_down) {
            movement_speed = camera_zoom / 200;
            dx = mouse_delta.x * movement_speed;
            dy = mouse_delta.y * movement_speed;
            rx = (dx*Math.cos(camera_rotation)) - (dy*Math.sin(camera_rotation));
            ry = (dx*Math.sin(camera_rotation)) + (dy*Math.cos(camera_rotation));

            camera_location.x = Math.min(Math.max(-50, camera_location.x + rx), 50);
            camera_location.y = Math.min(Math.max(-50, camera_location.y + ry), 50);
        }

        if (mouse_delta !== undefined && right_mouse_down) {
            camera_rotation += mouse_delta.x / 200;
        }

        light.position.set(
                Math.sin(Math.PI*2*(time_of_day/length_of_day)) * 50,
                Math.cos(Math.PI*2*(time_of_day/length_of_day)) * 50,
                0
        );

        new_camera_vector = new THREE.Vector3(-Math.sin(camera_rotation)* -1.2 *camera_zoom, camera_zoom, Math.cos(camera_rotation)*-1.2*camera_zoom);
        new_camera_vector.x += camera_location.x;
        new_camera_vector.z += camera_location.y;
        renderer.camera.position.set(new_camera_vector.x, new_camera_vector.y, new_camera_vector.z);
        renderer.camera.lookAt(new THREE.Vector3(camera_location.x, (-15/50)*camera_zoom, camera_location.y));


        renderer.renderer.render(renderer.scene, renderer.camera);
        status_banner.text(current_time());
        last_frame = now;
        mouse_last_at = mouse_at;
    }

    function mouse_move_handler(evt) {
        mouse_at = {x: evt.pageX, y: evt.pageY};
    }

    function mouse_down(evt) {
        if (evt.which == 1) {
            left_mouse_down = true;
            right_mouse_down = false;
        } else if (evt.which == 3) {
            right_mouse_down = true;
            left_mouse_down = false;
        } else {
            return;
        }
        mouse_down_at = {x: evt.pageX, y: evt.pageY};
        return false;
    }

    function mouse_up(evt) {
        var mouse_up_at = {x: evt.pageX, y: evt.pageY};
        if (evt.which == 1 && left_mouse_down && square_dist(mouse_down_at, mouse_up_at) < 100) left_click_handler(evt);
        if (evt.which == 3 && right_mouse_down && square_dist(mouse_down_at, mouse_up_at) < 100) right_click_handler(evt);
        if (evt.which == 1 || evt.which == 3) {
            right_mouse_down = false;
            left_mouse_down = false;
            mouse_down_at = undefined;
        } else {
            return;
        }
        return false;
    }

    function mouse_scroll(evt) {
        var scroll = evt.originalEvent.wheelDelta || evt.originalEvent.detail;
        camera_zoom -= scroll / 60;
        camera_zoom = Math.min(50, Math.max(5, camera_zoom));
        return false;
    }

    function left_click_handler(evt) {
        console.log("left");
    }

    function right_click_handler(evt) {
        console.log("right");
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
            var body = $("body");
            body.mousemove(mouse_move_handler);
            body.mousedown(mouse_down);
            body.mouseup(mouse_up);
            $(window).bind("mousewheel DOMMouseScroll", mouse_scroll);
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
