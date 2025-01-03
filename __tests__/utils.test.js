const { Command } = require('../src/utils')

jest.mock('node:child_process')

const exec = require('node:child_process').exec

describe('Command', () => {
  beforeAll(() => {
    exec.mockClear()
  })

  it('executes a command', async () => {
    const command = new Command()
    const to_exec = 'la -la'
    const expected = {
      code: 0,
      stdout: to_exec,
      stderr: ''
    }
    exec.mockImplementation((cmd, callback) =>
      callback(null, { stdout: cmd, stderr: '' })
    )
    const result = await command.execute(to_exec)
    expect(result).toEqual(expected)
  })

  it('executes a command with error', async () => {
    const command = new Command()
    const to_exec = 'la -la'
    const expected = {
      code: 1,
      stdout: to_exec,
      stderr: 'FAIL'
    }
    exec.mockImplementation((cmd, callback) => {
      const err = new Error('FAIL')
      err.code = expected.code
      err.stdout = expected.stdout
      err.stderr = expected.stderr
      callback(err)
    })

    const result = await command.execute(to_exec)
    expect(result).toEqual(expected)
  })
})
