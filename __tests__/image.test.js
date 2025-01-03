const { Image } = require('../src/image')

describe('Image', () => {
  describe('.get_image_name', () => {
    it('returns same image tag withdefault configuration', () => {
      const image_list = [
        'alpine',
        'alpine:3.14',
        'alpine@sha256:1234567890abcdef',
        'docker.io/alpine',
        'library/alpine',
        'docker.io/library/alpine',
        'docker.io/library/alpine:3.14@sha256:1234567890abcdef',
        'docker.io/my/ns/alpine:3.14@sha256:1234567890abcdef'
      ]
      for (const name of image_list) {
        const image = new Image(name)
        expect(image.get_image_name({})).toEqual(name)
      }
    })
    it('returns full image name with forced namespace, registry and tag', () => {
      const image_list = {
        alpine: 'docker.io/library/alpine:latest',
        'alpine:3.14': 'docker.io/library/alpine:3.14',
        'alpine@sha256:1234567890abcdef':
          'docker.io/library/alpine:latest@sha256:1234567890abcdef',
        'docker.io/alpine': 'docker.io/library/alpine:latest',
        'library/alpine': 'docker.io/library/alpine:latest',
        'docker.io/library/alpine': 'docker.io/library/alpine:latest',
        'docker.io/library/alpine:3.14@sha256:1234567890abcdef':
          'docker.io/library/alpine:3.14@sha256:1234567890abcdef',
        'docker.io/my/ns/alpine:3.14@sha256:1234567890abcdef':
          'docker.io/my/ns/alpine:3.14@sha256:1234567890abcdef'
      }
      for (const name in image_list) {
        const image = new Image(name)
        expect(
          image.get_image_name({
            force_namespace: true,
            force_registry: true,
            force_tag: true
          })
        ).toEqual(image_list[name])
      }
    })
    it('returns name without registry, tag and digest when configured', () => {
      const full_image = 'docker.io/my/ns/alpine:3.14@sha256:1234567890abcdef'
      const image = new Image(full_image)
      expect(
        image.get_image_name({
          registry: false,
          tag: false,
          digest: false
        })
      ).toEqual('my/ns/alpine')
    })
  })
  describe('.get_registry', () => {
    it('returns default registry when registry is null and default registry is used', () => {
      const image = new Image('alpine')
      expect(image.get_registry(true)).toEqual('docker.io')
    })
    it('returns null when registry is null and default registry is not used', () => {
      const image = new Image('alpine')
      expect(image.get_registry()).toEqual(null)
    })
    it('returns defined registry', () => {
      const image = new Image('ghcr.io/alpine')
      expect(image.get_registry()).toEqual('ghcr.io')
    })
  })
  describe('.get_name', () => {
    it('returns name', () => {
      for (const name of [
        'alpine',
        'docker.io/alpine',
        'docker.io/library/alpine',
        'docker.io/library/ns/alpine'
      ]) {
        const image = new Image(name)
        expect(image.get_name()).toEqual('alpine')
      }
    })
  })
  describe('.get_namespace', () => {
    it('returns default namespace when namespace is null and default namespace is used', () => {
      const image = new Image('alpine')
      expect(image.get_namespace(true)).toEqual('library')
    })
    it('returns null when namespace is null and default namespace is not used', () => {
      const image = new Image('alpine')
      expect(image.get_namespace()).toEqual(null)
    })
    it('returns defined namespace', () => {
      for (const name of [
        'docker.io/library/ns/alpine',
        'library/ns/alpine',
        'docker.io/library/ns/alpine:3.14@sha256:1234567890abcdef'
      ]) {
        const image = new Image(name)
        expect(image.get_namespace()).toEqual('library/ns')
      }
    })
  })
  describe('.get_tag', () => {
    it('returns default tag when tag is null and default tag is used', () => {
      const image = new Image('alpine')
      expect(image.get_tag(true)).toEqual('latest')
    })
    it('returns null when tag is null and default tag is not used', () => {
      const image = new Image('alpine')
      expect(image.get_tag()).toEqual(null)
    })
    it('returns defined tag', () => {
      for (const name of [
        'alpine:3.14',
        'docker.io/library/alpine:3.14',
        'docker.io/library/alpine:3.14@sha256:1234567890abcdef'
      ]) {
        const image = new Image(name)
        expect(image.get_tag()).toEqual('3.14')
      }
    })
  })
  describe('.get_digest', () => {
    it('returns null when digest is null', () => {
      const image = new Image('alpine')
      expect(image.get_digest()).toEqual(null)
    })
    it('returns defined digest', () => {
      const image = new Image('alpine@sha256:1234567890abcdef')
      expect(image.get_digest()).toEqual('sha256:1234567890abcdef')
    })
  })
  describe('.is_latest', () => {
    it('returns true when tag is latest', () => {
      const image = new Image('alpine:latest')
      expect(image.is_latest()).toEqual(true)
    })
    it('returns true when tag is not defined', () => {
      const image = new Image('alpine')
      expect(image.is_latest()).toEqual(true)
    })
    it('returns false when tag is not latest', () => {
      const image = new Image('alpine:3.14')
      expect(image.is_latest()).toEqual(false)
    })
  })
})
