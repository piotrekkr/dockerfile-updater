const core = require('@actions/core')
const semver = require('semver')
const { createHash } = require('node:crypto')
const { Image } = require('./image')
const { CredsHelper, DockerConfig } = require('./docker')

class RegistryAPIClient {
  DOCKER_HUB_URLS = ['docker.io', 'registry.docker.io', 'registry-1.docker.io']

  /** @type {Image|null} */
  #image = null

  /** @type {DockerConfig|null} */
  #docker_config = null

  /** @type {string|null|undefined} */
  #auth_token = undefined

  /**
   * @param {Image} image
   * @param {DockerConfig} docker_config
   */
  constructor(image, docker_config) {
    this.#image = image
    this.#docker_config = docker_config
  }

  async #call_registry_api_v2(api_path_suffix) {
    const ns_name = `${this.#image.get_namespace(true)}/${this.#image.get_name()}`
    const auth = await this.#get_auth_token()
    const headers = {}
    if (auth !== null) {
      headers['Authorization'] = `Bearer ${auth}`
    }
    const host = this.#get_registry_api_host()
    const resp = await fetch(
      `https://${host}/v2/${ns_name}/${api_path_suffix}`,
      { headers }
    )
    if (!resp.ok) {
      if (resp.status === 404) {
        core.debug(`404 status returned while calling ${resp.url}`)
        return null
      } else {
        throw Error(
          `Could not fetch data from ${resp.url}. [${resp.status}] ${resp.body}`
        )
      }
    }
    return resp
  }

  async get_available_tags() {
    const response = await this.#call_registry_api_v2(`tags/list`)
    if (response === null) {
      return []
    }
    return (await response.json())['tags']
  }

  async get_digest(tag) {
    const response = await this.#call_registry_api_v2(`manifests/${tag}`)
    if (response === null) {
      return null
    }
    const resp_text = await response.text()
    return `sha256:${createHash('sha256').update(resp_text).digest('hex')}`
  }

  async #get_auth_token() {
    if (this.#auth_token === undefined) {
      const url = this.#image.get_registry(true)
      const helper = await this.#docker_config.get_cred_helper(url)
      const auth = await this.#docker_config.get_auth(url)
      if (helper !== null) {
        this.#auth_token = await new CredsHelper(helper).get_secret(url)
      } else {
        this.#auth_token = await this.#get_auth_token_for_registry(url, auth)
      }
    }
    return this.#auth_token
  }

  async #get_auth_token_for_registry(url, auth_b64 = null) {
    let service = url
    let auth_url = url
    if (this.DOCKER_HUB_URLS.includes(service)) {
      service = 'registry.docker.io'
      auth_url = 'auth.docker.io'
    }
    const options = {}
    if (auth_b64 !== null) {
      options['headers'] = {
        Authorization: `Basic ${auth_b64}`
      }
    }
    const ns_name = `${this.#image.get_namespace(true)}/${this.#image.get_name()}`
    const res = await fetch(
      `https://${auth_url}/token?${new URLSearchParams({ service, scope: `repository:${ns_name}:pull` })}`,
      options
    )
    if (!res.ok) {
      throw Error(
        `Could not fetch auth token from ${auth_url}. [${res.status}] ${res.body}`
      )
    }
    const res_json = await res.json()
    return res_json['token']
  }

  #get_registry_api_host() {
    const url = this.#image.get_registry(true)
    if (this.DOCKER_HUB_URLS.includes(url)) {
      return 'index.docker.io'
    }
    return url
  }
}

class Registry {
  /** @type {Image|null} */
  #image = null

  /** @type {RegistryAPIClient|null} */
  #api_client = null

  /**
   * @param {Image} image
   * @param {RegistryAPIClient} api_client
   **/
  constructor(image, api_client) {
    this.#image = image
    this.#api_client = api_client
  }

  async get_latest_tag_and_digest() {
    const tag = this.#image.get_tag(true)
    if (semver.valid(tag)) {
      return await this.#get_latest_semver_tag_and_digest()
    } else {
      return {
        digest: await this.#api_client.get_digest(tag),
        tag
      }
    }
  }

  async #get_latest_semver_tag_and_digest() {
    const tag = this.#image.get_tag(true)
    const tag_parsed = semver.parse(tag, {})
    if (tag_parsed.build.length) {
      core.notice(`Not checking tag ${tag} for updates as it has a build part`)
      return {
        digest: await this.#api_client.get_digest(tag),
        tag
      }
    }
    const available_tags = await this.#api_client.get_available_tags()
    let latest_tag = tag
    for (const reg_tag of available_tags) {
      if (semver.valid(reg_tag)) {
        const reg_tag_parsed = semver.parse(reg_tag, {})
        if (
          tag_parsed.major === reg_tag_parsed.major &&
          tag_parsed.minor === reg_tag_parsed.minor &&
          tag_parsed.prerelease.length === reg_tag_parsed.prerelease.length &&
          tag_parsed.prerelease.every(
            (u, i) => u === reg_tag_parsed.prerelease[i]
          ) &&
          semver.gt(reg_tag_parsed, latest_tag)
        ) {
          latest_tag = reg_tag
        }
      }
    }
    return {
      digest: await this.#api_client.get_digest(latest_tag),
      tag: latest_tag
    }
  }
}

module.exports = {
  Registry,
  RegistryAPIClient
}
