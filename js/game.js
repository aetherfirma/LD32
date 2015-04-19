function main() {
    var renderer, world, textures = {}, surface, light, buildings,
        msg_banner = $("#msg-banner"), status_banner = $("#status-banner"),
        time = 0, last_frame, paused = false, length_of_day = 30000, game_speed = 0.25,
        start_year = 2143, start_date = 56, m, next_year, calendar_day;

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
        var now  = +new Date, dt = now - last_frame, time_of_day;
        if (!paused) {
            time += dt * game_speed;
        }
        time_of_day = (time - (length_of_day * 0.55)) % length_of_day;

        requestAnimationFrame(tick);
        light.position.set(
                Math.sin(Math.PI*2*(time_of_day/length_of_day)) * 50,
                0,
                Math.cos(Math.PI*2*(time_of_day/length_of_day)) * 50
        );
        renderer.renderer.render(renderer.scene, renderer.camera);
        status_banner.text(current_time());
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
            $("body").mousemove(function (evt) {
                msg_banner.hide();
                var x = (evt.pageX / innerWidth) * 2 - 1,
                    y = -(evt.pageY / innerHeight) * 2 + 1,
                    intersection, size = 100 / world.size, b, building;
                renderer.projector.setFromCamera({x: x, y: y}, renderer.camera);
                intersection = renderer.projector.intersectObject(surface);
                if (intersection.length === 1) {
                    intersection = intersection[0].point;
                } else {
                    return;
                }
                x = Math.round((50 + intersection.x) / size);
                y = Math.round((50 - intersection.y) / size);
                b = world.buildings[y * world.size + x];
                if (b !== 0) {
                    building = buildings[b - 1];
                    msg_banner.text(building.name + " (" + FACTIONS[building.affiliation] + ")");
                    msg_banner.show();
                    console.log(building.name, building.affiliation);
                }
            });
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
