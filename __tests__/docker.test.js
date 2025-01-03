const fs = require('node:fs/promises')
const os = require('node:os')
const core = require('@actions/core')
const { DockerConfig, CredsHelper } = require('../src/docker')
const { Command } = require('../src/utils')

jest.mock('node:fs/promises')
jest.mock('node:os')

const core_notice_spy = jest.spyOn(core, 'notice')
const core_warning_spy = jest.spyOn(core, 'warning')

const DOCKER_CONF_CONTENTS = `
{
  "auths": {
    "ghcr.io": {
      "auth": "dXNlcjpwYXNzCg=="
    }
  },
  "credHelpers": {
    "europe-docker.pkg.dev": "gcloud"
  }
}
`
describe('DockerConfig', () => {
  describe('.constructor', () => {
    beforeAll(() => {
      os.homedir.mockClear()
      os.homedir.mockReturnValue('/my/homedir')
    })
    it('should use default config path if not privided', async () => {
      const docker_conf = new DockerConfig()
      expect(docker_conf.get_path()).toEqual('/my/homedir/.docker/config.json')
    })

    it('should use provided config path', async () => {
      const path = '/my/custom/path/config.json'
      const docker_conf = new DockerConfig(path)
      expect(docker_conf.get_path()).toEqual(path)
    })
  })

  describe('config reading', () => {
    beforeAll(() => {
      fs.readFile.mockClear()
    })

    it('should cache read config', async () => {
      fs.readFile.mockResolvedValue('{}')
      const dockerfile = new DockerConfig()
      await dockerfile.get_cred_helper('europe-docker.pkg.dev')
      await dockerfile.get_cred_helper('europe-docker.pkg.dev')
      expect(fs.readFile).toHaveBeenCalledTimes(1)
    })

    it('should return empty object and print notice on read error', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT'))
      const dockerfile = new DockerConfig()
      const config = await dockerfile.get_cred_helper('europe-docker.pkg.dev')
      expect(config).toEqual(null)
      expect(core_notice_spy).toHaveBeenCalledTimes(1)
    })
  })

  describe('.get_creds_helper', () => {
    beforeAll(() => {
      fs.readFile.mockClear()
      fs.readFile.mockResolvedValue(DOCKER_CONF_CONTENTS)
    })

    it('should return null if no creds helper defined for url', async () => {
      const dockerfile = new DockerConfig()
      const helper = await dockerfile.get_cred_helper('docker.io')
      expect(helper).toEqual(null)
    })

    it('should return creds helper name for defined url', async () => {
      const dockerfile = new DockerConfig()
      const helper = await dockerfile.get_cred_helper('europe-docker.pkg.dev')
      expect(helper).toEqual('gcloud')
    })
  })

  describe('.get_auth', () => {
    beforeAll(() => {
      fs.readFile.mockClear()
      fs.readFile.mockResolvedValue(DOCKER_CONF_CONTENTS)
    })

    it('should return null if no auths defined for url', async () => {
      const dockerfile = new DockerConfig()
      const helper = await dockerfile.get_auth('europe-docker.pkg.dev')
      expect(helper).toEqual(null)
    })

    it('should return credentials for defined url', async () => {
      const dockerfile = new DockerConfig()
      const helper = await dockerfile.get_auth('ghcr.io')
      expect(helper).toEqual('dXNlcjpwYXNzCg==')
    })
  })
})

describe('CredsHelper', () => {
  const cmdSpy = jest.spyOn(Command.prototype, 'execute')

  beforeAll(() => {
    cmdSpy.mockClear()
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('will call proper command and return secret', async () => {
    cmdSpy.mockResolvedValue({
      code: 0,
      stdout: '{"Secret":"dXNlcjpwYXNzCg=="}',
      stderr: ''
    })
    const helper = new CredsHelper('gcloud')
    const secret = await helper.get_secret('europe-docker.pkg.dev')
    expect(cmdSpy).toHaveBeenCalledWith(
      `echo 'europe-docker.pkg.dev' | docker-credential-gcloud get`
    )
    expect(secret).toEqual('dXNlcjpwYXNzCg==')
  })

  it('will return null and print warning on command error', async () => {
    cmdSpy.mockResolvedValue({
      code: 1,
      stdout: '',
      stderr: 'FAIL'
    })
    const helper = new CredsHelper('gcloud')
    const secret = await helper.get_secret('europe-docker.pkg.dev')
    expect(core.warning).toHaveBeenCalledTimes(1)
    expect(secret).toEqual(null)
  })
})
