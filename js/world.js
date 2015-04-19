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
FACTIONS = ["Unaffiliated", "National Crime Agency", "Omnicorp", "Ender"];

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

function choose_building_name() {
    return Array.choice(BUILDING_PREFIXES) + Array.choice(BUILDING_NAMES) + Array.choice(BUILDING_SUFFIXES);
}

function generate_buildings(world) {
    var buildings = [], building, location, x, y,
        candidate, neighbours, neighbour, clear,
        n, m, type;

    world.buildings = new Uint8ClampedArray(world.size * world.size);
    world.people = [];

    for (n = 0; n < (world.size * world.size / 200); n++) {
        building = {
            affiliation: Array.choice([NEUTRAL, NEUTRAL, NEUTRAL, GOVERNMENT, CORPORATION, CULT]),
            height: Math.randint(2, 10),
            name: choose_building_name(),
            description: "A building.",
            known: false
        };
        location = undefined;
        do {
            candidate = {
                x: Math.randint(0, world.size - 1),
                y: Math.randint(0, world.size - 1)
            };

            type = world.get_type(candidate);
            if (world.buildings[candidate.y * world.size + candidate.x] != 0) continue;
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

        building.people = generate_people(building, world);
    }
    return buildings;
}

PERSON_TITLES = [
    "Mr", "Ms", "Mrs", "Mx", "Miss", "Dr", "Rev", "Rr Hon", "Sir", "Lady", "Lord"
];
PERSON_INITIALS = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];
PERSON_SURNAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia",  "Rodriguez",
    "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez",  "Moore", "Martin", "Jackson",
    "Thompson", "White", "Lopez", "Lee", "Gonzalez",  "Harris", "Clark", "Lewis", "Robinson", "Walker",
    "Perez", "Hall", "Young",  "Allen", "Sanchez", "Wright", "King", "Scott", "Green", "Baker", "Adams",
    "Nelson", "Hill", "Ramirez", "Campbell", "Mitchell", "Roberts", "Carter",  "Phillips", "Evans",
    "Turner", "Torres", "Parker", "Collins", "Edwards",  "Stewart", "Flores", "Morris", "Nguyen",
    "Murphy", "Rivera", "Cook", "Rogers",  "Morgan", "Peterson", "Cooper", "Reed", "Bailey", "Bell",
    "Gomez", "Kelly",  "Howard", "Ward", "Cox", "Diaz", "Richardson", "Wood", "Watson", "Brooks",
    "Bennett", "Gray", "James", "Reyes", "Cruz", "Hughes", "Price", "Myers",  "Long", "Foster",
    "Sanders", "Ross", "Morales", "Powell", "Sullivan",  "Russell", "Ortiz", "Jenkins", "Gutierrez",
    "Perry", "Butler", "Barnes",  "Fisher", "Henderson", "Coleman", "Simmons", "Patterson", "Jordan",
    "Reynolds",  "Hamilton", "Graham", "Kim", "Gonzales", "Alexander", "Ramos", "Wallace",
    "Griffin", "West", "Cole", "Hayes", "Chavez", "Gibson", "Bryant", "Ellis",  "Stevens", "Murray",
    "Ford", "Marshall", "Owens", "Mcdonald", "Harrison",  "Ruiz", "Kennedy", "Wells", "Alvarez",
    "Woods", "Mendoza", "Castillo", "Olson",  "Webb", "Washington", "Tucker", "Freeman", "Burns",
    "Henry", "Vasquez",  "Snyder", "Simpson", "Crawford", "Jimenez", "Porter", "Mason", "Shaw",
    "Gordon", "Wagner", "Hunter", "Romero", "Hicks", "Dixon", "Hunt", "Palmer",  "Robertson", "Black",
    "Holmes", "Stone", "Meyer", "Boyd", "Mills", "Warren",  "Fox", "Rose", "Rice", "Moreno", "Schmidt",
    "Patel", "Ferguson", "Nichols",  "Herrera", "Medina", "Ryan", "Fernandez", "Weaver", "Daniels",
    "Stephens",  "Gardner", "Payne", "Kelley", "Dunn", "Pierce", "Arnold", "Tran", "Spencer",
    "Peters", "Hawkins", "Grant", "Hansen", "Castro", "Hoffman", "Hart", "Elliott",  "Cunningham",
    "Knight", "Bradley", "Carroll", "Hudson", "Duncan", "Armstrong",  "Berry", "Andrews", "Johnston",
    "Ray", "Lane", "Riley", "Carpenter", "Perkins",  "Aguilar", "Silva", "Richards", "Willis",
    "Matthews", "Chapman", "Lawrence",  "Garza", "Vargas", "Watkins", "Wheeler", "Larson", "Carlson",
    "Harper",  "George", "Greene", "Burke", "Guzman", "Morrison", "Munoz", "Jacobs", "Obrien",
    "Lawson", "Franklin", "Lynch", "Bishop", "Carr", "Salazar", "Austin", "Mendez",  "Gilbert",
    "Jensen", "Williamson", "Montgomery", "Harvey", "Oliver", "Howell",  "Dean", "Hanson", "Weber",
    "Garrett", "Sims", "Burton", "Fuller", "Soto",  "Mccoy", "Welch", "Chen", "Schultz", "Walters",
    "Reid", "Fields", "Walsh",  "Little", "Fowler", "Bowman", "Davidson", "May", "Day", "Schneider",
    "Newman", "Brewer", "Lucas", "Holland", "Wong", "Banks", "Santos", "Curtis", "Pearson", "Delgado",
    "Valdez", "Pena", "Rios", "Douglas", "Sandoval", "Barrett", "Hopkins", "Keller", "Guerrero",
    "Stanley", "Bates", "Alvarado", "Beck", "Ortega", "Wade", "Estrada", "Contreras", "Barnett",
    "Caldwell", "Santiago", "Lambert", "Powers", "Chambers", "Nunez", "Craig", "Leonard", "Lowe",
    "Rhodes", "Byrd", "Gregory", "Shelton", "Frazier", "Becker", "Maldonado", "Fleming", "Vega",
    "Sutton", "Cohen", "Jennings", "Parks", "Mcdaniel", "Watts", "Barker", "Norris", "Vaughn",
    "Vazquez", "Holt", "Schwartz", "Steele", "Benson", "Neal", "Dominguez", "Horton", "Terry", "Wolfe",
    "Hale", "Lyons", "Graves", "Haynes", "Miles", "Park", "Warner", "Padilla", "Bush", "Thornton",
    "Mccarthy", "Mann", "Zimmerman", "Erickson", "Fletcher", "Mckinney", "Page", "Dawson", "Joseph",
    "Marquez", "Reeves", "Klein", "Espinoza", "Baldwin", "Moran", "Love", "Robbins", "Higgins", "Ball",
    "Cortez", "Le", "Griffith", "Bowen", "Sharp", "Cummings", "Ramsey", "Hardy", "Swanson", "Barber",
    "Acosta", "Luna", "Chandler", "Blair", "Daniel", "Cross", "Simon", "Dennis", "Oconnor", "Quinn",
    "Gross", "Navarro", "Moss", "Fitzgerald", "Doyle", "Mclaughlin", "Rojas", "Rodgers", "Stevenson",
    "Singh", "Yang", "Figueroa", "Harmon", "Newton", "Paul", "Manning", "Garner", "Mcgee", "Reese",
    "Francis", "Burgess", "Adkins", "Goodman", "Curry", "Brady", "Christensen", "Potter", "Walton",
    "Goodwin", "Mullins", "Molina", "Webster", "Fischer", "Campos", "Avila", "Sherman", "Todd",
    "Chang", "Blake", "Malone", "Wolf", "Hodges", "Juarez", "Gill", "Farmer", "Hines", "Gallagher",
    "Duran", "Hubbard", "Cannon", "Miranda", "Wang", "Saunders", "Tate", "Mack", "Hammond", "Carrillo",
    "Townsend", "Wise", "Ingram", "Barton", "Mejia", "Ayala", "Schroeder", "Hampton", "Rowe",
    "Parsons", "Frank", "Waters", "Strickland", "Osborne", "Maxwell", "Chan", "Deleon", "Norman",
    "Harrington", "Casey", "Patton", "Logan", "Bowers", "Mueller", "Glover", "Floyd", "Hartman",
    "Buchanan", "Cobb", "French", "Kramer", "Mccormick", "Clarke", "Tyler", "Gibbs", "Moody", "Conner",
    "Sparks", "Mcguire", "Leon", "Bauer", "Norton", "Pope", "Flynn", "Hogan", "Robles", "Salinas",
    "Yates", "Lindsey", "Lloyd", "Marsh", "Mcbride", "Owen", "Solis", "Pham", "Lang", "Pratt", "Lara",
    "Brock", "Ballard", "Trujillo", "Shaffer", "Drake", "Roman", "Aguirre", "Morton", "Stokes", "Lamb",
    "Pacheco", "Patrick", "Cochran", "Shepherd", "Cain", "Burnett", "Hess", "Li", "Cervantes", "Olsen",
    "Briggs", "Ochoa", "Cabrera", "Velasquez", "Montoya", "Roth", "Meyers", "Cardenas", "Fuentes",
    "Weiss", "Hoover", "Wilkins", "Nicholson", "Underwood", "Short", "Carson", "Morrow", "Colon",
    "Holloway", "Summers", "Bryan", "Petersen", "Mckenzie", "Serrano", "Wilcox", "Carey", "Clayton",
    "Poole", "Calderon", "Gallegos", "Greer", "Rivas", "Guerra", "Decker", "Collier", "Wall",
    "Whitaker", "Bass", "Flowers", "Davenport", "Conley", "Houston", "Huff", "Copeland", "Hood",
    "Monroe", "Massey", "Roberson", "Combs", "Franco", "Larsen", "Pittman", "Randall", "Skinner",
    "Wilkinson", "Kirby", "Cameron", "Bridges", "Anthony", "Richard", "Kirk", "Bruce", "Singleton",
    "Mathis", "Bradford", "Boone", "Abbott", "Charles", "Allison", "Sweeney", "Atkinson", "Horn",
    "Jefferson", "Rosales", "York", "Christian", "Phelps", "Farrell", "Castaneda", "Nash",
    "Dickerson", "Bond", "Wyatt", "Foley", "Chase", "Gates", "Vincent", "Mathews", "Hodge", "Garrison",
    "Trevino", "Villarreal", "Heath", "Dalton", "Valencia", "Callahan", "Hensley", "Atkins",
    "Huffman", "Roy", "Boyer", "Shields", "Lin", "Hancock", "Grimes", "Glenn", "Cline", "Delacruz",
    "Camacho", "Dillon", "Parrish", "Oneill", "Melton", "Booth", "Kane", "Berg", "Harrell", "Pitts",
    "Savage", "Wiggins", "Brennan", "Salas", "Marks", "Russo", "Sawyer", "Baxter", "Golden",
    "Hutchinson", "Liu", "Walter", "Mcdowell", "Wiley", "Rich", "Humphrey", "Johns", "Koch", "Suarez",
    "Hobbs", "Beard", "Gilmore", "Ibarra", "Keith", "Macias", "Khan", "Andrade", "Ware", "Stephenson",
    "Henson", "Wilkerson", "Dyer", "Mcclure", "Blackwell", "Mercado", "Tanner", "Eaton", "Clay",
    "Barron", "Beasley", "Oneal", "Preston", "Small", "Wu", "Zamora", "Macdonald", "Vance", "Snow",
    "Mcclain", "Stafford", "Orozco", "Barry", "English", "Shannon", "Kline", "Jacobson", "Woodard",
    "Huang", "Kemp", "Mosley", "Prince", "Merritt", "Hurst", "Villanueva", "Roach", "Nolan", "Lam",
    "Yoder", "Mccullough", "Lester", "Santana", "Valenzuela", "Winters", "Barrera", "Leach", "Orr",
    "Berger", "Mckee", "Strong", "Conway", "Stein", "Whitehead", "Bullock", "Escobar", "Knox",
    "Meadows", "Solomon", "Velez", "Odonnell", "Kerr", "Stout", "Blankenship", "Browning", "Kent",
    "Lozano", "Bartlett", "Pruitt", "Buck", "Barr", "Gaines", "Durham", "Gentry", "Mcintyre", "Sloan",
    "Melendez", "Rocha", "Herman", "Sexton", "Moon", "Hendricks", "Rangel", "Stark", "Lowery",
    "Hardin", "Hull", "Sellers", "Ellison", "Calhoun", "Gillespie", "Mora", "Knapp", "Mccall", "Morse",
    "Dorsey", "Weeks", "Nielsen", "Livingston", "Leblanc", "Mclean", "Bradshaw", "Glass",
    "Middleton", "Buckley", "Schaefer", "Frost", "Howe", "House", "Mcintosh", "Ho", "Pennington",
    "Reilly", "Hebert", "Mcfarland", "Hickman", "Noble", "Spears", "Conrad", "Arias", "Galvan",
    "Velazquez", "Huynh", "Frederick", "Randolph", "Cantu", "Fitzpatrick", "Mahoney", "Peck",
    "Villa", "Michael", "Donovan", "Mcconnell", "Walls", "Boyle", "Mayer", "Zuniga", "Giles", "Pineda",
    "Pace", "Hurley", "Mays", "Mcmillan", "Crosby", "Ayers", "Case", "Bentley", "Shepard", "Everett",
    "Pugh", "David", "Mcmahon", "Dunlap", "Bender", "Hahn", "Harding", "Acevedo", "Raymond",
    "Blackburn", "Duffy", "Landry", "Dougherty", "Bautista", "Shah", "Potts", "Arroyo", "Valentine",
    "Meza", "Gould", "Vaughan", "Fry", "Rush", "Avery", "Herring", "Dodson", "Clements", "Sampson",
    "Tapia", "Bean", "Lynn", "Crane", "Farley", "Cisneros", "Benton", "Ashley", "Mckay", "Finley",
    "Best", "Blevins", "Friedman", "Moses", "Sosa", "Blanchard", "Huber", "Frye", "Krueger", "Bernard",
    "Rosario", "Rubio", "Mullen", "Benjamin", "Haley", "Chung", "Moyer", "Choi", "Horne", "Yu",
    "Woodward", "Ali", "Nixon", "Hayden", "Rivers", "Estes", "Mccarty", "Richmond", "Stuart",
    "Maynard", "Brandt", "Oconnell", "Hanna", "Sanford", "Sheppard", "Church", "Burch", "Levy",
    "Rasmussen", "Coffey", "Ponce", "Faulkner", "Donaldson", "Schmitt", "Novak", "Costa", "Montes",
    "Booker", "Cordova", "Waller", "Arellano", "Maddox", "Mata", "Bonilla", "Stanton", "Compton",
    "Kaufman", "Dudley", "Mcpherson", "Beltran", "Dickson", "Mccann", "Villegas", "Proctor",
    "Hester", "Cantrell", "Daugherty", "Cherry", "Bray", "Davila", "Rowland", "Levine", "Madden",
    "Spence", "Good", "Irwin", "Werner", "Krause", "Petty", "Whitney", "Baird", "Hooper", "Pollard",
    "Zavala", "Jarvis", "Holden", "Haas", "Hendrix", "Mcgrath", "Bird", "Lucero", "Terrell", "Riggs",
    "Joyce", "Mercer", "Rollins", "Galloway", "Duke", "Odom", "Andersen", "Downs", "Hatfield",
    "Benitez", "Archer", "Huerta", "Travis", "Mcneil", "Hinton", "Zhang", "Hays", "Mayo", "Fritz",
    "Branch", "Mooney", "Ewing", "Ritter", "Esparza", "Frey", "Braun", "Gay", "Riddle", "Haney",
    "Kaiser", "Holder", "Chaney", "Mcknight", "Gamble", "Vang", "Cooley", "Carney", "Cowan", "Forbes",
    "Ferrell", "Davies", "Barajas", "Shea", "Osborn", "Bright", "Cuevas", "Bolton", "Murillo", "Lutz",
    "Duarte", "Kidd", "Key", "Cooke"
];

function choose_person_name() {
    return Array.choice(PERSON_TITLES) + ". " + Array.choice(PERSON_INITIALS) + ". " + Array.choice(PERSON_SURNAMES) + (Math.random() > 0.75 ? "-" + Array.choice(PERSON_SURNAMES) : "");
}

function generate_people(building, world) {
    var i, max_people = Math.randint(Math.floor(building.height / 2), Math.ceil(building.height * 1.5)),
        affiliation = [NEUTRAL, GOVERNMENT, CORPORATION, CULT, building.affiliation, building.affiliation],
        person, people = [];
    for (i = 0; i < max_people; i++) {
        person = {
            name: choose_person_name(),
            affiliation: Array.choice(affiliation),
            inventory: [],
            location: building,
            known: false
        };
        people.push(person);
        world.people.push(person);
    }
    return people;
}
