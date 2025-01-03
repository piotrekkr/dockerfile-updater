const { Registry, RegistryAPIClient } = require('../src/registry')
const { Image } = require('../src/image')
const { DockerConfig, CredsHelper } = require('../src/docker')
const { createHash } = require('node:crypto')
const core = require('@actions/core')

describe('RegistryApiClient', () => {
  beforeAll(() => {
    jest.spyOn(global, 'fetch')
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('should generate and use public access token when no docker.json file exit', async () => {
    const image = new Image('my-reg.io/my-ns/my-img:latest')
    const reg_host = image.get_registry(true)
    const docker_conf = new DockerConfig()
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'token' })
    })
    fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('{}')
    })
    await new RegistryAPIClient(image, docker_conf).get_digest(
      image.get_tag(true)
    )
    const params = new URLSearchParams({
      service: reg_host,
      scope: `repository:${image.get_namespace()}/${image.get_name()}:pull`
    })
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `https://${reg_host}/token?${params}`,
      {}
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `https://${reg_host}/v2/${image.get_namespace()}/${image.get_name()}/manifests/${image.get_tag(true)}`,
      {
        headers: {
          Authorization: 'Bearer token'
        }
      }
    )
  })

  it('should use creds helper data from docker.json if available', async () => {
    const image = new Image('my-reg.io/my-ns/my-img:latest')
    const reg_host = image.get_registry(true)
    const docker_conf = new DockerConfig()
    jest.spyOn(docker_conf, 'get_cred_helper').mockResolvedValue('gcloud')
    const token = 'creds-helper-token'
    jest.spyOn(CredsHelper.prototype, 'get_secret').mockResolvedValue(token)
    fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}')
    })
    await new RegistryAPIClient(image, docker_conf).get_digest(
      image.get_tag(true)
    )
    expect(fetch).toHaveBeenCalledWith(
      `https://${reg_host}/v2/${image.get_namespace()}/${image.get_name()}/manifests/${image.get_tag(true)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
  })

  it('should use auth data from docker.json config file', async () => {
    const image = new Image('my-reg.io/my-ns/my-img:latest')
    const reg_host = image.get_registry(true)
    const docker_conf = new DockerConfig()
    const b64_auth = Buffer.from('user:pass').toString('base64')
    jest.spyOn(docker_conf, 'get_cred_helper').mockResolvedValue(null)
    jest.spyOn(docker_conf, 'get_auth').mockResolvedValue(b64_auth)
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'token2' })
    })
    fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('{}')
    })
    await new RegistryAPIClient(image, docker_conf).get_digest(
      image.get_tag(true)
    )
    const params = new URLSearchParams({
      service: reg_host,
      scope: `repository:${image.get_namespace()}/${image.get_name()}:pull`
    })
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `https://${reg_host}/token?${params}`,
      {
        headers: {
          Authorization: `Basic ${b64_auth}`
        }
      }
    )
  })

  it('should use proper auth and service url for docker hub', async () => {
    const data = [
      {
        img_host: 'docker.io',
        auth_host: 'auth.docker.io',
        service_host: 'registry.docker.io'
      },
      {
        img_host: 'registry.docker.io',
        auth_host: 'auth.docker.io',
        service_host: 'registry.docker.io'
      },
      {
        img_host: 'registry-1.docker.io',
        auth_host: 'auth.docker.io',
        service_host: 'registry.docker.io'
      }
    ]
    for (const { img_host, auth_host, service_host } of data) {
      fetch.mockClear()
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'token4' })
      })
      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{}')
      })
      const image = new Image(`${img_host}/my-ns/my-img:latest`)
      const docker_conf = new DockerConfig()
      await new RegistryAPIClient(image, docker_conf).get_digest(
        image.get_tag(true)
      )
      const params = new URLSearchParams({
        service: service_host,
        scope: `repository:${image.get_namespace()}/${image.get_name()}:pull`
      })
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        `https://${auth_host}/token?${params}`,
        {}
      )
    }
  })

  it('.get_digest() will return correct digest', async () => {
    const image = new Image('my-reg.io/my-ns/my-img:latest')
    const reg_host = image.get_registry(true)
    const docker_conf = new DockerConfig()
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'token' })
    })
    const payload = '{}'
    fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(payload)
    })
    const digest = await new RegistryAPIClient(image, docker_conf).get_digest(
      image.get_tag(true)
    )
    expect(digest).toBe(
      `sha256:${createHash('sha256').update(payload).digest('hex')}`
    )
  })

  it('.get_available_tags() will return tag list', async () => {
    const image = new Image('my-reg.io/my-ns/my-img:latest')
    const reg_host = image.get_registry(true)
    const docker_conf = new DockerConfig()
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'token' })
    })
    const payload = { tags: ['tag1', 'tag2'] }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(payload)
    })
    const tags = await new RegistryAPIClient(
      image,
      docker_conf
    ).get_available_tags()
    expect(tags).toEqual(payload.tags)
  })
})

describe('Registry', () => {
  beforeAll(() => {
    jest.spyOn(RegistryAPIClient.prototype, 'get_digest')
    jest.spyOn(RegistryAPIClient.prototype, 'get_available_tags')
    jest.spyOn(core, 'notice')
  })
  afterAll(() => {
    jest.restoreAllMocks()
  })
  describe('.get_latest_tag_and_digest()', () => {
    it('should return same tag and latest digest for non-semver tags', async () => {
      const image = new Image('my-reg.io/my-ns/my-img:latest')
      const api_client = new RegistryAPIClient(image, new DockerConfig())
      const expected_digest = 'sha256:abcdef1234567890'
      const expected_tag = image.get_tag(true)
      api_client.get_digest.mockResolvedValue(expected_digest)
      const registry = new Registry(image, api_client)
      const { tag, digest } = await registry.get_latest_tag_and_digest()
      expect(tag).toBe(expected_tag)
      expect(digest).toBe(expected_digest)
    })

    it('should return same tag and latest digest for semver tags with build info', async () => {
      const image = new Image('my-reg.io/my-ns/my-img:v1.2.3-release+abcdef')
      const api_client = new RegistryAPIClient(image, new DockerConfig())
      const expected_digest = 'sha256:1234567890abcdef'
      const expected_tag = image.get_tag(true)
      api_client.get_digest.mockResolvedValue(expected_digest)
      const registry = new Registry(image, api_client)
      const { tag, digest } = await registry.get_latest_tag_and_digest()
      expect(tag).toBe(expected_tag)
      expect(digest).toBe(expected_digest)
      expect(core.notice).toHaveBeenCalledTimes(1)
    })

    it('should return latest patch version with same prerelease', async () => {
      const image = new Image('my-reg.io/my-ns/debian:v1.2.3-bookworm')
      const api_client = new RegistryAPIClient(image, new DockerConfig())
      const expected_digest = 'sha256:123abc'
      const expected_tag = 'v1.2.4-bookworm'
      api_client.get_available_tags.mockResolvedValue([
        'v1.3.0-bookworm',
        'v1.2.4-bookworm',
        'v1.2.3-bookworm',
        'v1.2.4-bullseye',
        'v1.2.3-bullseye',
        'v1.2.4'
      ])
      api_client.get_digest.mockResolvedValue(expected_digest)
      const registry = new Registry(image, api_client)
      const { tag, digest } = await registry.get_latest_tag_and_digest()
      expect(tag).toBe(expected_tag)
      expect(digest).toBe(expected_digest)
    })
  })
})
