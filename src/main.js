const core = require('@actions/core')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const dockerfile = core.getMultilineInput('dockerfile', { required: true })

    core.debug(`Checking for base image updates in: ${dockerfile}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
