class Image {
  #registry = null
  #namespace = null
  #name = null
  #tag = null
  #digest = null

  constructor(name) {
    this.#parse(name)
  }

  #parse(name) {
    const parts = name.split('/')
    // last part should be a name and optionally tag and digest
    this.#parse_name_tag_sha(parts.pop())
    // if there is more than one part, the first part should be a registry or namespace
    if (parts.length !== 0) {
      // check if first part can be a registry by checking if it contains a dot
      if (parts[0].includes('.')) {
        this.#registry = parts.shift()
      }
      if (parts.length !== 0) {
        // join remaining part to form namespace
        this.#namespace = parts.join('/')
      }
    }
  }

  #parse_name_tag_sha(name_tag_sha) {
    const parts = name_tag_sha.split('@', 2)
    // first part should be name and tag
    this.#parse_name_tag(parts.shift())
    // if there is a second part, it should be the digest
    if (parts.length !== 0) {
      this.#digest = parts[0]
    }
  }

  #parse_name_tag(name_tag) {
    const parts = name_tag.split(':', 2)
    // first part should be a name
    this.#name = parts.shift()
    // if there is a second part, it should be the tag
    if (parts.length !== 0) {
      this.#tag = parts[0]
    }
  }

  get_image_name({
    registry = true,
    force_registry = false,
    force_namespace = false,
    tag = true,
    force_tag = false,
    digest = true
  }) {
    const parts = []
    // check registry should be returned in the name
    if (registry) {
      // use defined registry if possible or use default registry if force_registry is set
      if (this.#registry !== null) {
        parts.push(this.#registry)
      } else if (force_registry) {
        parts.push('docker.io')
      }
    }
    // if namespace is set, use it, otherwise use default namespace if force_namespace is set
    if (this.#namespace !== null) {
      parts.push(this.#namespace)
    } else if (force_namespace) {
      parts.push('library')
    }
    // name should always be returned
    parts.push(this.#name)
    let full_name = parts.join('/')
    // check if tag should be returned in the name
    if (tag) {
      // use defined tag if possible or use latest tag if force_tag is set
      if (this.#tag !== null) {
        full_name += `:${this.#tag}`
      } else if (force_tag) {
        full_name += ':latest'
      }
    }
    // attach digest if it should be returned and is defined
    if (digest && this.#digest !== null) {
      full_name += `@${this.#digest}`
    }
    return full_name
  }

  get_name() {
    return this.#name
  }

  get_registry(use_default = false) {
    return this.#registry === null && use_default ? 'docker.io' : this.#registry
  }

  get_namespace(use_default = false) {
    return this.#namespace === null && use_default ? 'library' : this.#namespace
  }

  get_tag(use_default = false) {
    return this.#tag === null && use_default ? 'latest' : this.#tag
  }

  get_digest() {
    return this.#digest
  }

  is_latest() {
    return this.get_tag(true) === 'latest'
  }
}

module.exports = {
  Image
}
