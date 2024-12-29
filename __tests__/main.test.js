/**
 * Unit tests for the action's main functionality, src/main.js
 */
const core = require('@actions/core')
const main = require('../src/main')

// Mock the GitHub Actions core library
const debugMock = jest.spyOn(core, 'debug').mockImplementation()
const getMultilineInputMock = jest
  .spyOn(core, 'getMultilineInput')
  .mockImplementation()
const setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets a failed status', async () => {
    // Set the action's inputs as return values from core.getMultilineInput()
    getMultilineInputMock.mockImplementation(name => {
      switch (name) {
        case 'dockerfile':
          throw new Error('Some issue occurred')
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'Some issue occurred')
  })

  it('fails if no input is provided', async () => {
    // Set the action's inputs as return values from core.getInput()
    getMultilineInputMock.mockImplementation(name => {
      switch (name) {
        case 'dockerfile':
          throw new Error('Input required and not supplied: dockerfile')
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      'Input required and not supplied: dockerfile'
    )
  })
})
