const { Dockerfile, DockerfileUpdater } = require('../src/dockerfile')
const core = require('@actions/core')
const { run } = require('../src/main')

jest.mock('../src/dockerfile')

describe('run()', () => {
  beforeAll(() => {
    jest.spyOn(core, 'getMultilineInput')
  })
  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('should work on all input paths', async () => {
    core.getMultilineInput.mockReturnValueOnce(['path1', 'path2'])
    await run()
    expect(core.getMultilineInput).toHaveBeenCalledWith('dockerfile', {
      required: true
    })
    expect(DockerfileUpdater.prototype.update).toHaveBeenCalledTimes(2)
  })
})
