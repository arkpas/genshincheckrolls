function round(number, decimalPlaces) {
	return parseFloat((Math.round((number * 10)) / 10).toFixed(decimalPlaces));
}

module.exports = { round };