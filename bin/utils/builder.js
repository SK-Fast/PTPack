import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import yaml from 'yaml'
import luamin from 'luamin'

export function getConfiguration(projectPath) {
  const configFile = fs.readFileSync(path.join(projectPath, 'polypack_config.yaml'), 'utf8')
  const configurations = yaml.parse(configFile)

  return configurations
}

export function *getFilesRecursively(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      yield* getFilesRecursively(path.join(dir, file.name));
    } else {
      yield path.join(dir, file.name);
    }
  }
}


export function buildProject(projectPath, configs) {
  const configurations = getConfiguration(projectPath)

  if (!configurations.place_file) {
    console.log(chalk.redBright(`Place file is missing!`))
    return
  }

  const placeFileContent = fs.readFileSync(path.join(projectPath, configurations.place_file), 'utf8')

  const placeFileParser = new DOMParser()
  const placeFileSerializer = new XMLSerializer()
  const placeFileDom = placeFileParser.parseFromString(placeFileContent, "text/xml")

  const itemInstances = placeFileDom.getElementsByTagName('Item')

  let importStack = ''

  const modulesPath = path.join(projectPath, 'modules/')
  const modulesList = getFilesRecursively(modulesPath)
  let modulesCount = 0;
  
  for (let moduleScript of modulesList) {
    modulesCount++
    const relativePath = path.relative(modulesPath, moduleScript)

    console.log(chalk.gray(`Importing module: ${relativePath}`))

    const fileRead = fs.readFileSync(moduleScript, 'utf8')
    importStack += `__requireExports['${relativePath}'] = function()\n`
    importStack += `${fileRead}\n`
    importStack += `end\n`
  }

  for (let item of Array.from(itemInstances)) {
    if (item.getAttribute('class') == "ScriptInstance") {
      const properties = item.getElementsByTagName('Properties')[0]
      const stringTags = properties.getElementsByTagName('string')
      let scriptSourceTag = ''

      for (let stringTag of Array.from(stringTags)) {
        if (stringTag.getAttribute('name') == "Source") {
          scriptSourceTag = stringTag
        }
      }

      // Include require line
      scriptSourceTag.childNodes['0'].data = `local __requireExports = {}
      \n ${importStack}\n function require(moduleName)
      return __requireExports[moduleName]()
  end\n ${scriptSourceTag.childNodes['0'].data}`

      if (configs) {
        if (configs['mini'] == true) {
            scriptSourceTag.childNodes['0'].data = luamin.minify(scriptSourceTag.childNodes['0'].data)
        }
      }
    }
  }

  const resultContent = placeFileSerializer.serializeToString(placeFileDom)

  fs.writeFileSync(path.join(projectPath, configurations.out_place_file), resultContent, 'utf8')

  return {configFile: configurations, placeFileContent: placeFileContent, modulesCount: modulesCount}
}