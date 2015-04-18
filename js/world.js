WATER = 0;
BEACH = 1;
LAND = 2;
MOUNTAIN = 3;

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
        slope_cutoff = 0.35, beach_cutoff = 0.1, bump_modifier,
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
            bump_height = Math.round((height - world.sealevel) / bump_modifier * 255);
            type[size * y + x] = (underwater ? WATER : (bump_height < (bump_modifier * beach_cutoff) ? BEACH : (slope_value < slope_cutoff ? MOUNTAIN : LAND)));
        }
    }

    world.type = type;
    world.time = (+new Date) - start;

    return world;
}

function get_slope(world, coord) {
    var neighbours = [
        {x: coord.x + 1, y: coord.y},
        {x: coord.x + 1, y: coord.y + 1},
        {x: coord.x + 1, y: coord.y - 1},
        {x: coord.x, y: coord.y},
        {x: coord.x, y: coord.y + 1},
        {x: coord.x, y: coord.y - 1},
        {x: coord.x - 1, y: coord.y},
        {x: coord.x - 1, y: coord.y + 1},
        {x: coord.x - 1, y: coord.y - 1}
        ],
        neighbour, n, height_delta, slopes = [];
    for (n in neighbours) {
        neighbour = neighbours[n];
        if (neighbour.x < 0 || neighbour.x >= world.size || neighbour.y < 0 || neighbour.y >= world.size) {
            continue;
        }
        height_delta = Math.abs(world.get(neighbour) - world.get(coord));
        slopes.push(Math.atan2(height_delta, 1));
    }
    return Array.max(slopes);
}

function generate_texture_maps(world, context) {
    var bump = context.createImageData(world.size, world.size),
        spec = context.createImageData(world.size, world.size),
        slope = context.createImageData(world.size, world.size),
        tex = context.createImageData(world.size, world.size),
        p, r, g, b, a, x, y, bump_modifier = 255 - world.sealevel,
        bump_height, spec_value, slope_value, underwater, height, height_mod,
        water_r = 122, water_g = 196, water_b = 245,
        land_r = 119, land_g = 168, land_b = 120,
        beach_r = 243, beach_g = 233, beach_b = 167, beach_cutoff = 0.1,
        mountain = 235, slope_cutoff = 90, cell_type;

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
        underwater = height <= world.sealevel;
        spec_value = underwater ? 255 : 0;
        slope_value = Math.round(get_slope(world, {x: x, y: y}) / Math.PI * 255);

        cell_type = world.get_type({x: x, y: y});

        tex.data[r] = Math.round((cell_type === WATER ? water_r : (cell_type === BEACH ? beach_r : (cell_type === MOUNTAIN ? mountain : land_r))) * height_mod);
        tex.data[g] = Math.round((cell_type === WATER ? water_g : (cell_type === BEACH ? beach_g : (cell_type === MOUNTAIN ? mountain : land_g))) * height_mod);
        tex.data[b] = Math.round((cell_type === WATER ? water_b : (cell_type === BEACH ? beach_b : (cell_type === MOUNTAIN ? mountain : land_b))) * height_mod);
        tex.data[a] = 255;

        bump.data[r] = bump_height;
        bump.data[g] = bump_height;
        bump.data[b] = underwater ? 255 : bump_height;
        bump.data[a] = 255;

        spec.data[r] = spec_value;
        spec.data[g] = spec_value;
        spec.data[b] = spec_value;
        spec.data[a] = 255;

        slope.data[r] = slope_value;
        slope.data[g] = slope_value;
        slope.data[b] = underwater ? 255 : slope_value;
        slope.data[a] = 255;
    }

    return {"bump": bump, "spec": spec, "slope": slope, "tex": tex};
}
