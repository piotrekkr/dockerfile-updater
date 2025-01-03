const core = require('@actions/core')
const { Dockerfile, DockerfileUpdater } = require('./dockerfile')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  const paths = core.getMultilineInput('dockerfile', { required: true })
  for (const path of paths) {
    const updater = new DockerfileUpdater(path)
    await updater.update()
  }
}

module.exports = {
  run
}
