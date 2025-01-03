const fs = require('node:fs/promises')
const { Registry, RegistryAPIClient } = require('./registry')
const { Image } = require('./image')
const { DockerConfig } = require('./docker')

class Dockerfile {
  #REGEX_INSTR_FROM = /^FROM\s+(\S+)(\s+AS\s+(\S+))?$/gim

  #REGEX_INSTR_COPY = /^COPY\s+.*--from=(\S+).*$/gim

  #contents = null

  #path = null

  constructor(path) {
    this.#path = path
  }

  async read() {
    if (this.#contents === null) {
      this.#contents = await fs.readFile(this.#path, { encoding: 'utf8' })
    }
    return this.#contents
  }

  async write(contents) {
    await fs.writeFile(this.#path, contents)
    this.#contents = contents
  }

  #add_image(results, image_name, full_instruction, alias = null) {
    if (results.images?.[image_name] === undefined) {
      results.images[image_name] = []
    }
    // image name => full line matched
    results.images[image_name].push(full_instruction)
    if (alias !== null) {
      results.aliases[alias] = true
    }
  }

  #delete_aliases_from_images(results) {
    for (const alias in results.aliases) {
      // delete local aliases from instructions
      if (alias in results.images) {
        delete results.images[alias]
      }
    }
  }

  async #extract_images_from_from_instructions() {
    const results = {
      images: {},
      aliases: {}
    }
    const contents = await this.read()
    const matches = contents.matchAll(this.#REGEX_INSTR_FROM)
    for (const match of matches) {
      const full_line = match[0]
      const image_name = match[1]
      const alias = match?.[3]
      this.#add_image(results, image_name, full_line, alias)
    }
    this.#delete_aliases_from_images(results)
    return results
  }

  async #extract_images_from_copy_instructions(results) {
    const contents = await this.read()
    const matches = contents.matchAll(this.#REGEX_INSTR_COPY)

    for (const match of matches) {
      const image_or_alias = match[1]
      // add instruction only if it is not using local alias
      if (!(image_or_alias in results.aliases)) {
        this.#add_image(results, image_or_alias, match[0])
      }
    }
  }

  async images() {
    const results = await this.#extract_images_from_from_instructions()
    await this.#extract_images_from_copy_instructions(results)
    return results.images
  }
}

class DockerfileUpdater {
  /** @type {Dockerfile|null} */
  #dockerfile = null

  constructor(path) {
    this.#dockerfile = new Dockerfile(path)
  }

  async #get_instructions_to_update() {
    const to_check = await this.#dockerfile.images()
    const to_update = []
    for (const image_name in to_check) {
      const latest_image_name = await this.#get_latest_image(image_name)
      if (image_name === latest_image_name) {
        // nothing to update
        continue
      }
      for (const instruction of to_check[image_name]) {
        to_update.push([
          instruction,
          instruction.replace(image_name, latest_image_name)
        ])
      }
    }
    return to_update
  }

  async update() {
    const to_update = await this.#get_instructions_to_update()
    let contents = await this.#dockerfile.read()
    for (const instruction of to_update) {
      contents = contents.replace(instruction[0], instruction[1])
    }
    await this.#dockerfile.write(contents)
  }

  async #get_latest_image(image_name) {
    const image = new Image(image_name)
    const registry = new Registry(
      image,
      new RegistryAPIClient(
        image,
        new DockerConfig(process.env?.DOCKER_CONFIG_PATH)
      )
    )
    const latest_tag_and_digest = await registry.get_latest_tag_and_digest()
    let latest_image_name = image.get_image_name({
      tag: false,
      digest: false
    })
    latest_image_name += `:${latest_tag_and_digest.tag}@${latest_tag_and_digest.digest}`
    return latest_image_name
  }
}

module.exports = {
  Dockerfile,
  DockerfileUpdater
}
