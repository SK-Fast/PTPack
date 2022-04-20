import chalk from 'chalk'
import fs from 'fs'
import path from 'path'

export function getClient() {
    chalk.blueBright(`⏳ Locating client installation...`)

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

    return {clientPath: clientPath, versionCount: versionCount}
}