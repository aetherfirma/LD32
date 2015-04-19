WATER = 0;
BEACH = 1;
LAND = 2;
MOUNTAIN = 3;
SHORE = 4;

function generate_heightmap(size, scale, water_coverage) {
    if (scale === undefined) {
        scale = 0.01;
    }
    if (water_coverage === undefined) {
        water_coverage = 0.7;
    }
    var size2 = size * size,
        heightmap = new Uint8ClampedArray(size2),
        type = new Uint8ClampedArray(size2),
        height_distribution = new Uint32Array(256),
        start = +new Date,
        height, x, y, height_mod, underwater, slope_value, bump_height,
        slope_cutoff = 0.36, beach_cutoff = 0.1, bump_modifier,
        world = {
            "get": function (coord) {
                if (coord.x < 0 || coord.x >= size || coord.y < 0 || coord.y >= size) {
                    throw "Coordinate is outside the map!";
                }
                return heightmap[coord.y * size + coord.x];
            },
            "get_type": function (coord) {
                if (coord.x < 0 || coord.x >= size || coord.y < 0 || coord.y >= size) {
                    throw "Coordinate is outside the map!";
                }
                return type[coord.y * size + coord.x];
            },
            "size": size
        };

    Perlin.noiseDetail(3, 0.5);

    for (y = 0; y < size; y++) {
        for (x = 0; x < size; x++) {
            height = Math.round(Perlin.noise(x * scale, y * scale) * 256);
            heightmap[size * y + x] = height;
            height_distribution[height] += 1;
        }
    }
    world.map = heightmap;

    var rolling_sum = 0;
    for (var sea_level = 0; sea_level < 256; sea_level++) {
        rolling_sum += height_distribution[sea_level];
        if (rolling_sum >= water_coverage * size2) {
            break;
        }
    }
    world.sealevel = sea_level;
    bump_modifier = 255 - world.sealevel;

    for (y = 0; y < size; y++) {
        for (x = 0; x < size; x++) {
            height = heightmap[size * y + x];
            height_mod = height / 256;
            underwater = height <= world.sealevel;
            slope_value = get_slope(world, {x: x, y: y}) / Math.PI;
            //if (!underwater) console.log(slope_value);
            bump_height = Math.round((height - world.sealevel) / bump_modifier * 255);
            type[size * y + x] = (underwater ? (height > (sea_level - (bump_modifier * beach_cutoff)) ? SHORE : WATER) : (bump_height < (bump_modifier * beach_cutoff) ? BEACH : (slope_value > slope_cutoff ? MOUNTAIN : LAND)));
        }
    }

    world.type = type;
    world.time = (+new Date) - start;

    return world;
}

function get_slope(world, coord) {
    var neighbours = get_neighbours(world, coord),
        neighbour, n, height_delta, slopes = [], angle;
    for (n in neighbours) {
        neighbour = neighbours[n];
        height_delta = Math.abs(world.get(neighbour) - world.get(coord));
        angle = Math.atan2(height_delta, 1);
        if (!isNaN(angle)) slopes.push(angle);
    }
    return Array.max(slopes);
}

function generate_bump_map(world) {
    var bump_tex = document.createElement("canvas").getContext("2d"),
        bump = bump_tex.createImageData(world.size, world.size),
        p, r, g, b, a, x, y, bump_modifier = 255 - world.sealevel,
        bump_height, height, height_mod;

    bump_tex.canvas.width = bump_tex.canvas.height = world.size;

    for (p = 0; p < world.size * world.size; p++) {
        r = p * 4;
        g = r + 1;
        b = g + 1;
        a = b + 1;

        height = world.map[p];
        height_mod = height / 256;
        x = p % world.size;
        y = Math.floor(p / world.size);

        bump_height = Math.round((height - world.sealevel) / bump_modifier * 255);

        bump.data[r] = bump_height;
        bump.data[g] = bump_height;
        bump.data[b] = bump_height;
        bump.data[a] = 255;
    }

    bump_tex.putImageData(bump, 0, 0);

    return bump_tex.canvas;
}

function generate_spec_map(world) {
    var spec_tex = document.createElement("canvas").getContext("2d"),
        spec = spec_tex.createImageData(world.size, world.size),
        p, r, g, b, a, x, y,
        spec_value, underwater, height, height_mod;

    spec_tex.canvas.width = spec_tex.canvas.height = world.size;

    for (p = 0; p < world.size * world.size; p++) {
        r = p * 4;
        g = r + 1;
        b = g + 1;
        a = b + 1;

        height = world.map[p];
        height_mod = height / 256;
        x = p % world.size;
        y = Math.floor(p / world.size);

        underwater = height <= world.sealevel;
        spec_value = underwater ? 100 : 0;

        spec.data[r] = spec_value;
        spec.data[g] = spec_value;
        spec.data[b] = spec_value;
        spec.data[a] = 255;
    }

    spec_tex.putImageData(spec, 0, 0);

    return spec_tex.canvas;
}

function generate_diff_map(world) {
    var diff_tex = document.createElement("canvas").getContext("2d"),
        diff = diff_tex.createImageData(world.size, world.size),
        p, r, g, b, a, x, y, height, height_mod,
        water_r = 122, water_g = 196, water_b = 245,
        shore_r = 194, shore_g = 231, shore_b = 237,
        land_r = 119, land_g = 168, land_b = 120,
        beach_r = 243, beach_g = 233, beach_b = 167,
        mountain = 235, cell_type;

    diff_tex.canvas.width = diff_tex.canvas.height = world.size;

    for (p = 0; p < world.size * world.size; p++) {
        r = p * 4;
        g = r + 1;
        b = g + 1;
        a = b + 1;

        height = world.map[p];
        height_mod = height / 256;
        x = p % world.size;
        y = Math.floor(p / world.size);

        cell_type = world.get_type({x: x, y: y});

        diff.data[r] = Math.round((cell_type === WATER ? water_r : (cell_type === SHORE ? shore_r : (cell_type === BEACH ? beach_r : (cell_type === MOUNTAIN ? mountain : land_r)))) * height_mod);
        diff.data[g] = Math.round((cell_type === WATER ? water_g : (cell_type === SHORE ? shore_g : (cell_type === BEACH ? beach_g : (cell_type === MOUNTAIN ? mountain : land_g)))) * height_mod);
        diff.data[b] = Math.round((cell_type === WATER ? water_b : (cell_type === SHORE ? shore_b : (cell_type === BEACH ? beach_b : (cell_type === MOUNTAIN ? mountain : land_b)))) * height_mod);
        diff.data[a] = 255;
    }

    diff_tex.putImageData(diff, 0, 0);

    return diff_tex.canvas;
}

NEUTRAL = 0;
GOVERNMENT = 1;
CORPORATION = 2;
CULT = 3;
FACTIONS = ["Neutral", "Government", "Corporation", "Cult"];

BUILDING_PREFIXES = [
    "The ", "New ", "Uptown ", "Digital ", "Analogue ", "Downtown ",
    "Old ", "Free ", "International ", "National ", "General ",
    "Applied ",
    ""
];
BUILDING_NAMES = [
    "Franklin", "Excel", "Parliament", "Leman", "Russ", "Kerbal",
    "Eldar", "Column", "Technic", "Technical", "Science", "Hydro",
    "Farm", "Lamp", "Cheesegrater", "Gherkin", "Netrunner", "Hobbit",
    "Giant", "Java", "Haskel", "Swift", "Harlequin", "Angel", "Salamander",
    "Salem", "Witch", "Wraith", "Broad", "Market", "Forge", "Factory",
    "Cactus", "Rose", "Tulip", "Cube", "Pyramid", "Train", "Vision",
    "White", "Red", "Green", "Blue", "Ludum Dare", "Knife", "Photo",
    "Cab", "Oil", "Solar", "Resin", "Coal", "Tree", "Oak", "Fountain",
    "Marine", "Boat", "Ship", "Aero", "Auto", "Robot", "Machine", "Glove",
    "Box", "Pizza", "Pasta", "Candle", "Flame", "Fire", "Cactus", "Fork",
    "Money", "Note", "Check", "Window", "Door", "Arch", "Archway", "Decon",
    "Bishop", "Priest", "Church", "Temple", "Sky", "Ground", "Tunnel", "Cave",
    "Plan", "Blueprint", "Kid", "Teen", "Adult", "Pension", "Sketch", "Helicopter",
    "Electric", "Atomic", "Research", "Academic"
];
BUILDING_SUFFIXES = [
    " Institute", " Building", " Centre", " Hall", " Tower", " Campus",
    " Industries", " Incorporated", " Limited", " Park", " Services",
    " House", " Productions", " Agency", " Esquire", " Club",
    ""
];

function choose_name() {
    return Array.choice(BUILDING_PREFIXES) + Array.choice(BUILDING_NAMES) + Array.choice(BUILDING_SUFFIXES);
}

function generate_buildings(world) {
    //debugger;
    var buildings = [], building, location, x, y,
        candidate, neighbours, neighbour, clear,
        n, m, type;

    world.buildings = new Uint8ClampedArray(world.size * world.size);

    for (n = 0; n < (world.size * world.size / 327); n++) {
        building = {
            affiliation: Array.choice([NEUTRAL, NEUTRAL, NEUTRAL, GOVERNMENT, CORPORATION, CULT]),
            height: Math.randint(2, 10),
            name: choose_name()
        };
        location = undefined;
        do {
            candidate = {
                x: Math.randint(0, world.size - 1),
                y: Math.randint(0, world.size - 1)
            };
            type = world.get_type(candidate);
            if (!(type === LAND)) continue;
            neighbours = get_neighbours(world, candidate);
            if (neighbours.length !== 8) continue;
            clear = true;
            for (m in neighbours) {
                neighbour = neighbours[m];
                if (world.buildings[neighbour.y * world.size + neighbour.x] != 0 || world.get_type(neighbour) == WATER) {
                    clear = false;
                    break;
                }
            }
            if (clear) location = candidate;
        } while (location === undefined);
        building.location = location;
        world.buildings[location.y * world.size + location.x] = buildings.length + 1;
        buildings.push(building);
    }
    return buildings;
}
