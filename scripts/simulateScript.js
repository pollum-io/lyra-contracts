const { simulateScript, decodeResult } = require("@chainlink/functions-toolkit")
const path = require("path")
const process = require("process")


    ; (async () => {
        const requestConfigPath = path.join(process.cwd(), "Functions-request-config.js")
        const requestConfig = require(requestConfigPath)
        // Simulate the JavaScript execution locally
        const { responseBytesHexstring, errorString, capturedTerminalOutput } = await simulateScript(requestConfig)
        console.log(`${capturedTerminalOutput}\n`)
        if (responseBytesHexstring) {
            console.log(
                `Response returned by script during local simulation: ${decodeResult(
                    responseBytesHexstring,
                    requestConfig.expectedReturnType
                ).toString()}\n`
            )
        }
        if (errorString) {
            console.log(`Error returned by simulated script:\n${errorString}\n`)
        }


    })();