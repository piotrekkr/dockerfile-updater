const util = require('node:util')
const exec = util.promisify(require('node:child_process').exec)

class Command {
  async execute(command) {
    try {
      const { stdout, stderr } = await exec(command)
      return { code: 0, stdout, stderr }
    } catch (error) {
      return {
        code: error.code,
        stdout: error.stdout,
        stderr: error.stderr
      }
    }
  }
}

module.exports = {
  Command
}
