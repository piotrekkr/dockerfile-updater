const fs = require('node:fs/promises')
const { Dockerfile, DockerfileUpdater } = require('../src/dockerfile')
const { Registry } = require('../src/registry')

jest.mock('node:fs/promises')

const DOCKERFILE_CONTENTS = `
FROM docker.io/library/nginx:stable-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-01
FROM docker.io/library/nginx:stable-bookworm AS nginx-02
FROM library/nginx:stable-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-03
FROM library/nginx:stable-bookworm AS nginx-04
FROM nginx:stable-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-05
FROM nginx:stable-bookworm AS nginx-06
FROM nginx:1.27.2-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-07
FROM nginx:1.27.2-bookworm AS nginx-08
FROM nginx:1.27-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-09
FROM nginx:1.27-bookworm AS nginx-10
FROM nginx:1-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-11
FROM nginx:1-bookworm AS nginx-12
FROM nginx:1@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-13
FROM nginx:1 AS nginx-14
FROM nginx@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-15
FROM nginx@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-16
FROM nginx AS nginx-17
FROM nginx-16 AS nginx-18
RUN echo OK
COPY --from=busybox:latest /bin/busybox /bin/busybox
COPY --from=nginx-01 /bin/nginx /bin/nginx
FROM my-host.com/my/namespace/img-name:latest AS private-img
`

const EXPECTED_IMAGES = {
  'docker.io/library/nginx:stable-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470':
    [
      'FROM docker.io/library/nginx:stable-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-01'
    ],
  'docker.io/library/nginx:stable-bookworm': [
    'FROM docker.io/library/nginx:stable-bookworm AS nginx-02'
  ],
  'library/nginx:stable-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470':
    [
      'FROM library/nginx:stable-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-03'
    ],
  'library/nginx:stable-bookworm': [
    'FROM library/nginx:stable-bookworm AS nginx-04'
  ],
  'nginx:stable-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470':
    [
      'FROM nginx:stable-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-05'
    ],
  'nginx:stable-bookworm': ['FROM nginx:stable-bookworm AS nginx-06'],
  'nginx:1.27.2-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470':
    [
      'FROM nginx:1.27.2-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-07'
    ],
  'nginx:1.27.2-bookworm': ['FROM nginx:1.27.2-bookworm AS nginx-08'],
  'nginx:1.27-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470':
    [
      'FROM nginx:1.27-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-09'
    ],
  'nginx:1.27-bookworm': ['FROM nginx:1.27-bookworm AS nginx-10'],
  'nginx:1-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470':
    [
      'FROM nginx:1-bookworm@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-11'
    ],
  'nginx:1-bookworm': ['FROM nginx:1-bookworm AS nginx-12'],
  'nginx:1@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470':
    [
      'FROM nginx:1@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-13'
    ],
  'nginx:1': ['FROM nginx:1 AS nginx-14'],
  'nginx@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470':
    [
      'FROM nginx@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-15',
      'FROM nginx@sha256:bc5eac5eafc581aeda3008b4b1f07ebba230de2f27d47767129a6a905c84f470 AS nginx-16'
    ],
  nginx: ['FROM nginx AS nginx-17'],
  'my-host.com/my/namespace/img-name:latest': [
    'FROM my-host.com/my/namespace/img-name:latest AS private-img'
  ],
  'busybox:latest': ['COPY --from=busybox:latest /bin/busybox /bin/busybox']
}

describe('Dockerfile', () => {
  describe('.read', () => {
    beforeAll(() => {
      fs.readFile.mockClear()
      fs.readFile.mockResolvedValue(DOCKERFILE_CONTENTS)
    })

    it('should return file contents from path', async () => {
      const dockerfile = new Dockerfile('some/path')
      await dockerfile.read()
      expect(fs.readFile).toHaveBeenCalledTimes(1)
      expect(fs.readFile).toHaveBeenCalledWith('some/path', {
        encoding: 'utf8'
      })
    })

    it('should read from path only once', async () => {
      const dockerfile = new Dockerfile('some/path')
      await dockerfile.read()
      await dockerfile.read()
      expect(fs.readFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('.write', () => {
    beforeAll(() => {
      fs.writeFile.mockClear()
      fs.readFile.mockClear()
    })

    it('should write contents to file under path', async () => {
      const dockerfile = new Dockerfile('some/path')
      await dockerfile.write('test')
      expect(fs.writeFile).toHaveBeenCalledWith('some/path', 'test')
    })

    it('should cache written contents and not call read', async () => {
      const dockerfile = new Dockerfile('some/path')
      await dockerfile.write('new-content')
      expect(await dockerfile.read()).toBe('new-content')
      expect(fs.readFile).not.toHaveBeenCalled()
    })
  })
  describe('.images', () => {
    beforeAll(() => {
      fs.readFile.mockClear()
      fs.readFile.mockResolvedValue(DOCKERFILE_CONTENTS)
    })

    it('should extract images from dockerfile contents', async () => {
      const dockerfile = new Dockerfile('some/path')
      const images = await dockerfile.images()
      expect(images).toEqual(EXPECTED_IMAGES)
    })
  })
})

describe('DockerfileUpdater', () => {
  beforeAll(() => {
    jest.spyOn(Dockerfile.prototype, 'read')
    jest.spyOn(Dockerfile.prototype, 'write')
    jest.spyOn(Registry.prototype, 'get_latest_tag_and_digest')
  })
  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('should add latest tag and digest if tag is missing', async () => {
    const dockerfile = new Dockerfile('some/path')
    const contents = 'FROM nginx as test1'
    dockerfile.read.mockResolvedValue(contents)
    Registry.prototype.get_latest_tag_and_digest.mockResolvedValueOnce({
      tag: 'latest',
      digest: 'sha256:aaaa'
    })
    const updater = new DockerfileUpdater(dockerfile)
    await updater.update()
    expect(dockerfile.write).toHaveBeenCalledWith(
      'FROM nginx:latest@sha256:aaaa as test1'
    )
  })

  it('should add digest if missing', async () => {
    const dockerfile = new Dockerfile('some/path')
    const contents = 'FROM nginx:1.2.3 as test1'
    dockerfile.read.mockResolvedValue(contents)
    Registry.prototype.get_latest_tag_and_digest.mockResolvedValueOnce({
      tag: '1.2.3',
      digest: 'sha256:aaaa'
    })
    const updater = new DockerfileUpdater(dockerfile)
    await updater.update()
    expect(dockerfile.write).toHaveBeenCalledWith(
      'FROM nginx:1.2.3@sha256:aaaa as test1'
    )
  })

  it('should not add digest if no digest can be found', async () => {
    const dockerfile = new Dockerfile('some/path')
    const contents = 'FROM nginx:latest as test1'
    dockerfile.read.mockResolvedValue(contents)
    Registry.prototype.get_latest_tag_and_digest.mockResolvedValueOnce({
      tag: 'latest',
      digest: null
    })
    const updater = new DockerfileUpdater(dockerfile)
    await updater.update()
    expect(dockerfile.write).toHaveBeenCalledWith('FROM nginx:latest as test1')
  })

  it('should not update digest if no digest can be found', async () => {
    const dockerfile = new Dockerfile('some/path')
    const contents = 'FROM nginx:1.2.3@sha256:abcdef as test1'
    dockerfile.read.mockResolvedValue(contents)
    Registry.prototype.get_latest_tag_and_digest.mockResolvedValueOnce({
      tag: '1.2.3',
      digest: null
    })
    const updater = new DockerfileUpdater(dockerfile)
    await updater.update()
    expect(dockerfile.write).toHaveBeenCalledWith(
      'FROM nginx:1.2.3@sha256:abcdef as test1'
    )
  })

  it('should update digest if latest one is different', async () => {
    const dockerfile = new Dockerfile('some/path')
    const contents = 'FROM nginx:tag@sha256:aaaa as test1'
    dockerfile.read.mockResolvedValue(contents)
    Registry.prototype.get_latest_tag_and_digest.mockResolvedValueOnce({
      tag: 'tag',
      digest: 'sha256:bbbb'
    })
    const updater = new DockerfileUpdater(dockerfile)
    await updater.update()
    expect(dockerfile.write).toHaveBeenCalledWith(
      'FROM nginx:tag@sha256:bbbb as test1'
    )
  })

  it('should update all instructions with latest images and digests', async () => {
    const dockerfile = new Dockerfile('some/path')
    const contents = [
      'FROM nginx as test1',
      'COPY --from=docker.io/nginx:1.2.3@sha256:abcd /bin/nginx /bin/nginx',
      'RUN echo OK'
    ]
    dockerfile.read.mockResolvedValue(contents.join('\n'))
    Registry.prototype.get_latest_tag_and_digest.mockResolvedValueOnce({
      tag: 'latest',
      digest: 'sha256:aaaa'
    })
    Registry.prototype.get_latest_tag_and_digest.mockResolvedValueOnce({
      tag: '1.2.4',
      digest: 'sha256:bbbb'
    })
    const updater = new DockerfileUpdater(dockerfile)
    await updater.update()
    expect(dockerfile.write).toHaveBeenCalledWith(
      [
        'FROM nginx:latest@sha256:aaaa as test1',
        'COPY --from=docker.io/nginx:1.2.4@sha256:bbbb /bin/nginx /bin/nginx',
        'RUN echo OK'
      ].join('\n')
    )
  })
})
