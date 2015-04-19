Array.max = function( array ){
    return Math.max.apply( Math, array );
};
Math.randint = function (min, max) {
    return Math.round(Math.random() * (max - min)) + min;
};
Array.choice = function (array) {
    return array[Math.randint(0, array.length - 1)]
};
function get_neighbours(world, coord) {
    var candidates = [
        {x: coord.x + 1, y: coord.y},
        {x: coord.x + 1, y: coord.y + 1},
        {x: coord.x + 1, y: coord.y - 1},
        {x: coord.x, y: coord.y + 1},
        {x: coord.x, y: coord.y - 1},
        {x: coord.x - 1, y: coord.y},
        {x: coord.x - 1, y: coord.y + 1},
        {x: coord.x - 1, y: coord.y - 1}
        ],
        neighbour, neighbours = [], n;
    for (n in candidates) {
        neighbour = candidates[n];
        if (neighbour.x < 0 || neighbour.x >= world.size || neighbour.y < 0 || neighbour.y >= world.size) {
            continue;
        }
        neighbours.push(neighbour);
    }
    return neighbours;
}
function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
