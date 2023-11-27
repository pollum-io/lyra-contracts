const fs = require("fs")
const { Location, ReturnType, CodeLanguage } = require("@chainlink/functions-toolkit")

const requestConfig = {
	source: fs.readFileSync("./BCB-request.js").toString(),
	// Location of source code (only Inline is currently supported)
	codeLocation: Location.Inline,
	// Code language (only JavaScript is currently supported)
	codeLanguage: CodeLanguage.JavaScript,
	// Expected type of the returned value
	expectedReturnType: ReturnType.bytes,
}

module.exports = requestConfig
