function main() {
    var renderer, world, textures = {}, surface, light, buildings,
        msg_banner = $("#msg-banner"), status_banner = $("#status-banner"),
        dialogue = $("#left-dialogue"), timeline = $("#right-dialogue"), timeline_list = timeline.find("ul"),
        time = 0, last_frame, paused = false, length_of_day = 30000, game_speed = 0.1,
        start_year = 2143, start_date = 56, m, next_year, calendar_day,
        camera_location = {x: 0, y: 0}, camera_rotation = Math.PI/2, camera_zoom = 50,
        left_mouse_down = false, right_mouse_down = false, mouse_down_at,
        mouse_at, mouse_last_at,
        player_building, handler_building,
        selected_building, desired_position,
        player_building_marker, handler_building_marker,
        generator, relay, sphere,
        schedule = [],
        described_building, travelling = false, handler_busy = false,
        building_select = new buzz.sound("sound/building-select", {formats: ["wav"]});;

    function write_date(current_time) {
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

        calendar_day = Math.floor(current_time / length_of_day);
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

        time_of_day = ((current_time % length_of_day) / length_of_day) * 24 * 60;
        hour = Math.floor(time_of_day / 60);
        minutes = Math.floor(time_of_day % 60);

        return pad(hour, 2) + ":" + pad(minutes, 2) + " " + calendar_day + " " + day + " " + month + " " + year;
    }

    function pick_building(coord) {
        var intersections;
        renderer.projector.setFromCamera({
            x: (coord.x / innerWidth) * 2 - 1,
            y: -(coord.y / innerHeight) * 2 + 1
        }, renderer.camera);
        intersections = renderer.projector.intersectObjects(world.building_meshes);
        if (intersections.length > 0) {
            return intersections[0].object.building;
        }
    }

    function name_building(building) {
        if (building.known) {
            return building.name + " (" + FACTIONS[building.affiliation] + ")";
        } else {
            return building.name;
        }
    }

    function describe_building(building) {
        var description = $("<div></div>"), occupants = $("<ul></ul>"), actions = $("<ul></ul>"), action;
        description.append($("<h2>" + name_building(building) + "</h2>"));
        description.append($("<p>" + building.description + (building === player_building ? " You are here." : "") + "</p>"));

        // TODO: Describe occupants
        description.append($("<h3>Notable Occupants</h3>"));
        description.append(occupants);

        description.append($("<h3>Actions</h3>"));
        if (travelling) {
            description.append($("<p>You cannot work whilst travelling.</p>"))
        } else {
            if (building !== player_building) {
                var distance, go_here;
                distance = Math.sqrt(square_dist(player_building.location, building.location)) * (length_of_day / 24 / 6);
                go_here = $("<a href='javascript:void'>Go here (approx. " + describe_time(distance, length_of_day) + " away)</a>");
                go_here.click(function () {
                    travelling = true;
                    game_speed = 5;
                    selected_building = undefined;
                    append_to_timeline(timeline_list, "You leave " + player_building.name + " heading towards " + building.name + ". You think you will arrive about " + write_date(time + distance) + ".");
                    schedule.push({"due": time + distance, "do": function () {
                        travelling = false;
                        game_speed = 0.1;
                        player_building = building;
                        selected_building = building;
                        append_to_timeline(timeline_list, "You arrive at " + building.name);
                    }})
                });
                action = $("<li></li>");
                action.append(go_here);
                actions.append(action);
            }

            if (!building.known) {
                var ask_handler, cost;
                ask_handler = $("<a href='javascript:void'>Ask your handler about " + building.name + "</a>");
                if (handler_busy) {
                    ask_handler.click(function () {
                        append_to_timeline(timeline_list, "Your handler tells you to stop calling. They're still busy with your last request.")
                    })
                } else {
                    cost = length_of_day / 24 / 3 * Math.randint(1, 10);
                    ask_handler.click(function () {
                        append_to_timeline(timeline_list, "Your handler writes down the building name and says they'll get back to you in about " + describe_time(cost, length_of_day) + ".");
                        described_building = undefined;
                        handler_busy = true;
                        schedule.push({"due": time + cost, "do": function () {
                            handler_busy = false;
                            building.known = true;
                            described_building = undefined;
                            append_to_timeline(timeline_list, "You get a call from your handler. It turns out that " + building.name + " belongs to the " + FACTIONS[building.affiliation] + ".");
                        }})
                    })
                }
                action = $("<li></li>");
                action.append(ask_handler);
                actions.append(action);
            }

            if (building === handler_building) {
                var leave;
                leave = $("<a href='javascript:void'>Leave this city</a>");
                leave.click(function () {
                    if (relay === null && sphere === null && generator === null) {
                        append_to_timeline(timeline_list, "You hand all three components of the XN47 to your handler. They place them in the case and congratulate you on a job well done. You board the shuttle and leave this planet, never to return. <strong>YOU WIN!</strong>");
                    } else {
                        append_to_timeline(
                            timeline_list,
                            "Your handler asks if this is some kind of joke." +
                            (relay !== null ? " You still don't have the relay." : "") +
                            (generator !== null ? " You still don't have the generator." : "") +
                            (sphere !== null ? " You still don't have the sphere." : "") +
                            " They storm off and slam the door. You think they're angry."
                        )
                    }
                });
                action = $("<li></li>");
                action.append(leave);
                actions.append(action);
            }

            description.append(actions);
        }

        return description;
    }

    function tick() {
        var now  = +new Date, dt = now - last_frame, time_of_day, new_camera_vector,
            building, mouse_delta, movement_speed, dx, dy, rx, ry,  player_loc, handler_loc,
            temp_schedule, i, item;
        if (!paused) {
            time += dt * game_speed;
        }
        time_of_day = (time - (length_of_day * 0.55)) % length_of_day;

        temp_schedule = schedule;
        schedule = [];
        for (i in temp_schedule) {
            item = temp_schedule[i];
            if (item.due < time) {
                item.do();
            } else {
                schedule.push(item);
            }
        }

        if (mouse_last_at !== undefined) {
            mouse_delta = {x: mouse_last_at.x - mouse_at.x, y: mouse_last_at.y - mouse_at.y};
        }

        requestAnimationFrame(tick);

        msg_banner.hide();
        if (mouse_at !== undefined) {
            building = pick_building(mouse_at);
            if (building !== undefined) {
                msg_banner.text(name_building(building));
                msg_banner.show();
            }
        }

        player_loc = map_xy_to_world_xy(player_building.location, 100/world.size);
        player_building_marker.position.set(player_loc.x, player_building.height * (100/world.size), player_loc.y);
        player_building_marker.rotation.y = time / 100;

        handler_loc = map_xy_to_world_xy(handler_building.location, 100/world.size);
        handler_building_marker.position.set(handler_loc.x, handler_building.height * (100/world.size), handler_loc.y);
        handler_building_marker.rotation.y = time / 100;

        if (selected_building !== undefined) {
            if (described_building !== selected_building) {
                dialogue.empty();
                dialogue.append(describe_building(selected_building));
                dialogue.show();
                described_building = selected_building;
            }
        } else {
            described_building = undefined;
            dialogue.empty();
            dialogue.hide();
        }


        if (desired_position === undefined && mouse_delta !== undefined && left_mouse_down) {
            movement_speed = camera_zoom / 3;
            dx = mouse_delta.x * movement_speed * (dt / 1000);
            dy = mouse_delta.y * movement_speed * (dt / 1000);
            rx = (dx*Math.cos(camera_rotation)) - (dy*Math.sin(camera_rotation));
            ry = (dx*Math.sin(camera_rotation)) + (dy*Math.cos(camera_rotation));

            camera_location.x = Math.min(Math.max(-50, camera_location.x - rx), 50);
            camera_location.y = Math.min(Math.max(-50, camera_location.y - ry), 50);
        }
        if (desired_position !== undefined) {
            movement_speed = camera_zoom;
            dx = desired_position.x - camera_location.x;
            dy = desired_position.y - camera_location.y;
            console.log(dx, dy);
            if (dx !== 0) {
                rx = (dx / Math.abs(dx)) * movement_speed * (dt / 1000);
                if (dx < rx) {
                    camera_location.x = desired_position.x;
                } else {
                    camera_location.x += rx;
                }
            }
            if (dy !== 0) {
                ry = (dy / Math.abs(dy)) * movement_speed * (dt / 1000);
                if (dy < ry) {
                    camera_location.y = desired_position.y;
                } else {
                    camera_location.y += ry;
                }
            }
            if (camera_location.x === desired_position.x && camera_location.y === desired_position.y) {
                desired_position = undefined;
            }
        }

        if (mouse_delta !== undefined && right_mouse_down) {
            camera_rotation -= mouse_delta.x / 3 * (dt / 1000);
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
        status_banner.text(write_date(time) + (travelling ? " - Travelling" : ""));
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
        var building = pick_building({x: evt.pageX, y: evt.pageY});
        if (building !== undefined) {
            selected_building = building;
            camera_location = map_xy_to_world_xy(building.location, 100/world.size);
            building_select.play();
        } else {
            selected_building = undefined;
            building_select.play();
        }
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
            world = generate_heightmap(512);
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
            var game_window = $(renderer.renderer.domElement), opening_dialogue;

            document.body.appendChild(renderer.renderer.domElement);
            status_banner.show();
            timeline.show();

            last_frame = +new Date;
            player_building_marker = create_marker("^", 0xffffff);
            renderer.scene.add(player_building_marker);

            handler_building_marker = create_marker("!", 0xffffff);
            renderer.scene.add(handler_building_marker);

            game_window.mousemove(mouse_move_handler);
            game_window.mousedown(mouse_down);
            game_window.mouseup(mouse_up);
            game_window.bind("mousewheel DOMMouseScroll", mouse_scroll);
            $(window).resize(function () {
                renderer.camera.aspect = innerWidth/innerHeight;
                renderer.camera.updateProjectionMatrix();
                renderer.renderer.setSize(innerWidth, innerHeight);
            });
            renderer.renderer.domElement.oncontextmenu = function(){return false};

            player_building = Array.choice(world.building_meshes).building;
            do {
                handler_building = Array.choice(world.building_meshes).building;
            } while (handler_building === player_building);

            generator = Array.choice(world.people);
            do {
                relay = Array.choice(world.people);
            } while (relay === generator || relay.affiliation === generator.affiliation);
            do {
                sphere = Array.choice(world.people);
            } while (sphere === generator || sphere === relay || sphere.affiliation === generator.affiliation || sphere.affiliation === relay.affiliation);

            selected_building = player_building;
            camera_location = map_xy_to_world_xy(player_building.location, 100/world.size);
            camera_zoom = 5;

            opening_dialogue  = "Last night you stole the XN47 experimental weapons platform from the Omnicorp HQ just outside the city of New Durum. ";
            opening_dialogue += "You fled via hovercraft and managed to make it into the city proper where you ducked into the lobby of " + player_building.name;
            opening_dialogue += " where you have been hiding all night. You prepare to head on towards " + handler_building.name + " where your handler is ";
            opening_dialogue += "waiting for you when you notice your one of your bags have been stolen! You still have the body of the weapon, but the ";
            opening_dialogue += "<em>Window Generator</em>, the <em>Affirmation Relay</em> and most importantly the <em>Correction Sphere</em> are missing! ";
            opening_dialogue += "You search the CCTV and see that the <em>National Crime Agency</em>, agents from <em>Omnicorp</em> and the doomsday cult ";
            opening_dialogue += "<em>Ender</em> broke in and stole part of it each! They will have hidden their peices somewhere around the city and will ";
            opening_dialogue += "have discovered their pieces are not complete. Find the pieces before they do, and escape before they find you.";
            append_to_timeline(timeline_list, opening_dialogue);
            append_to_timeline(timeline_list, "Click on a building to take a look inside, or scroll down to read the background.");

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
