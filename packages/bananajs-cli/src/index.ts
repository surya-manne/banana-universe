#!/usr/bin/env node

import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { spawn } from 'child_process'
import inquirer from 'inquirer'

const MONGO_TEMPLATE_REPO = 'https://github.com/sprakas/bananajs-mongo-app-template.git'
const SQL_TEMPLATE_REPO = 'https://github.com/sprakas/bananajs-sql-app-template.git'

async function createApp() {
  const { appName, templateType } = await inquirer.prompt([
    {
      type: 'input',
      name: 'appName',
      message: 'What is the name of your app?',
      default: 'my-bananajs-app',
    },
    {
      type: 'list',
      name: 'templateType',
      message: 'Which app configuration do you want?',
      choices: ['MongoDB', 'SQL'],
    },
  ])

  const appDir = path.join(process.cwd(), appName)

  try {
    await fs.stat(appDir)
    console.log(chalk.red(`An app with the name "${appName}" already exists.`))
    process.exit(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error('Error checking if app exists:', error)
      process.exit(1)
    }
  }

  await fs.mkdir(appDir)

  try {
    if (templateType === 'MongoDB') {
      await setupAppConfiguration(appDir, appName, MONGO_TEMPLATE_REPO)
    } else {
      await setupAppConfiguration(appDir, appName, SQL_TEMPLATE_REPO)
    }
  } catch (error) {
    console.error('Error creating app:', error)
    console.log(chalk.yellow(`Make sure to available git on your cli before running the command.`))
    await fs.rmdir(appDir, { recursive: true })

    process.exit(1)
  }
}

async function setupAppConfiguration(appDir: string, appName: string, repo: string) {
  try {
    await new Promise<void>((resolve, reject) => {
      const gitSetup = spawn('git', ['clone', '--depth', '1', '--progress', repo, appDir])

      gitSetup.stderr.on('data', (data) => {
        const output = data.toString()
        if (output.includes('Cloning into')) {
          return
        }
        console.log(chalk.gray(output))
      })

      gitSetup.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green(`App "${appName}" created successfully!`))

          // Delete the .git folder to remove the git history of the template repo
          const gitFolderPath = path.join(appDir, '.git')
          fs.rm(gitFolderPath, { recursive: true, force: true })

          resolve()
        } else {
          console.log(chalk.red(`Failed to create the app with exit code ${code}.`))
          reject()
        }
      })
    })
  } catch (error) {
    console.error('Error during app setup:', error)
    throw error
  }
}

const command = process.argv[2]

if (command !== 'new') {
  console.log(chalk.red(`Unknown command: ${command}`))
  process.exit(1)
}

if (command === 'new') {
  createApp()
}
