Array.max = function( array ){
    return Math.max.apply( Math, array );
};
Math.randint = function (min, max) {
    return Math.round(Math.random() * (max - min)) + min;
};
Array.prototype.choice = function () {
    return this[Math.randint(0, this.length - 1)]
};
