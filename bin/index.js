#! /usr/bin/env node
import yargs from 'yargs'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import fse from 'fs-extra'
import { hideBin } from 'yargs/helpers'
import childProcess from 'child_process'
import nodeWatch from 'node-watch'
import { getConfiguration, buildProject } from './utils/builder.js'
import input from 'input';

yargs(hideBin(process.argv))
.command('init <project_name>', 'Create new Polytoria Project.', () => {}, async (argv) => {
  console.info(argv)

    if (argv.project_name) {
      console.log(chalk.blueBright(`Creating new Polytoria project: ${argv.project_name}`))
      const projectPath = path.resolve(process.cwd(), argv.project_name)

      if (fs.existsSync(projectPath) == true) {
        const confirmMessage = await input.confirm(`Project ${argv.project_name} already exists. Do you want to overwrite it?`)

        if (confirmMessage == false) {
          return
        }
      }

      fse.copySync(path.join(path.parse(argv.$0).dir, 'project_template'), projectPath)

      console.log(chalk.greenBright(`Successfully created ${argv.project_name}!`));
      console.log(chalk.bold(`\nGet started:`));
      console.log(`   cd ${argv.project_name}`);
      console.log(`   ptpack dev\n`);

    }
})
.command('build', 'Build project', () => {}, (argv) => {
  console.log(chalk.blueBright(`🔨 Building the project...\n`))
  
  const buildStartTime = new Date().getTime()

  const buildResult = buildProject(process.cwd(), argv)

  const buildEndTime = new Date().getTime()

  const buildTime = buildEndTime - buildStartTime

  console.log(`${chalk.greenBright('\n🎉 Successfully built a project!')} ${chalk.gray(`->`)} ${chalk.blueBright(buildTime + 'ms')}`)
  console.log(`${chalk.gray('\n Modules Built: ')} ${chalk.bold(buildResult.modulesCount)}`)
})

.command('dev', 'Start a dev server with auto reloading.', () => {}, () => {
  console.log(chalk.blueBright(`⏳ Locating client installation...`))
  
  const appRoaming = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
  const polytoriaClient = path.join(appRoaming, 'Polytoria')

  if (!fs.existsSync(polytoriaClient)) {
    console.log(chalk.redBright(`❌ Polytoria client installation not found, Please make sure that the client is installed.`))
    return
  }

  const settingsJson = fs.readFileSync(path.join(polytoriaClient, 'Settings.json'), 'utf8')
  let settingsData = JSON.parse(settingsJson)

  if (!settingsData['Manifest']['Client']) {
    console.log(chalk.redBright(`❌ Settings.json is corrupted or formatting changed.`))
    return
  }

  settingsData['Manifest']['Client'] = settingsData['Manifest']['Client'].sort(function compareFn(a, b) {
    if (parseInt(a.Version) == NaN || parseInt(b.Version) == NaN) {
      return -1
    }
    return a.Version < b.Version ? -1 : 1
  })

  const versionCount = settingsData['Manifest']['Client'][0].Version
  const clientPath = path.join(polytoriaClient, 'Client', versionCount)

  const configurations = getConfiguration(process.cwd())

  console.log('\n')
  console.log(chalk.blueBright(`PolyPack Development Server`))
  console.log(chalk.gray(`Client Version: ${versionCount}`))
  console.log(chalk.gray(`Place file path: ${path.resolve(configurations.out_place_file)}`))

  let clientProcess;
  let scriptUpdating = false;

  function openClient() {
    clientProcess = childProcess.execFile(path.join(clientPath, 'Polytoria'), [`-solo`, `${path.resolve(configurations.out_place_file)}`], (error, stdout, stderr) => {
      if (error) {
        if (scriptUpdating) {
          return
        }
        console.log(chalk.redBright(`❌ Polytoria client failed to start.`))
        console.log(chalk.redBright(`${error}`))
        return
      }
    })

    clientProcess.addListener('exit', () => {
      if (scriptUpdating) {
        return
      }
      console.log(chalk.yellowBright(`👋 Polytoria client closed.`))
      process.exit()
    })
  }

  function updateProject() {
    scriptUpdating = true
    if (clientProcess) {
      clientProcess.kill()

    }

    buildProject(process.cwd())

    setTimeout(() => {
      openClient()
      scriptUpdating = false
    }, 1000)
  }

  updateProject()

  nodeWatch(path.join(process.cwd(), 'modules'), { recursive: true }, (evt, name) => {
    console.log(chalk.blueBright(`🔮 Changes found! Updating...`))
    updateProject()
  })

  nodeWatch(path.join(process.cwd(), configurations.place_file), { recursive: true }, (evt, name) => {
    console.log(chalk.blueBright(`🔮 Changes found! Updating...`))
    updateProject()
  })

})
.demandCommand(1)
.parse()