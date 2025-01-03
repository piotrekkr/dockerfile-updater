const os = require('node:os')
const path = require('node:path')
const core = require('@actions/core')
const fs = require('node:fs/promises')
const { Command } = require('./utils')

class DockerConfig {
  #path = path.join(os.homedir(), '.docker', 'config.json')

  /** @type {Object|undefined} */
  #config = undefined

  constructor(conf_path = undefined) {
    if (conf_path !== undefined) {
      this.#path = conf_path
    }
  }

  async #read_config() {
    if (this.#config === undefined) {
      try {
        this.#config = JSON.parse(
          await fs.readFile(this.#path, { encoding: 'utf8' })
        )
      } catch (error) {
        core.notice(
          `Could not read docker config file at ${this.#path}. Reason: ${error}`
        )
        this.#config = {}
      }
    }
    return this.#config
  }

  async get_cred_helper(url) {
    const config = await this.#read_config()
    if (config.credHelpers?.[url] === undefined) {
      return null
    }

    return config.credHelpers[url]
  }

  async get_auth(url) {
    const config = await this.#read_config()
    if (config.auths?.[url] === undefined) {
      return null
    }
    return config.auths[url]['auth']
  }

  get_path() {
    return this.#path
  }
}

class CredsHelper {
  #name = null

  constructor(name) {
    this.#name = name
  }

  async get_secret(url) {
    const cmd = new Command()
    const result = await cmd.execute(
      `echo '${url}' | docker-credential-${this.#name} get`
    )
    if (result.code !== 0) {
      core.warning(
        `Could not get credentials for ${url} from ${this.#name}. Error: ${result.stderr}`
      )
      return null
    }
    return JSON.parse(result.stdout)['Secret']
  }
}

module.exports = {
  DockerConfig,
  CredsHelper
}
