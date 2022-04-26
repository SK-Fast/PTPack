import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import yaml from 'yaml'
import luamin from 'luamin'
import luaparse from 'luaparse'

export function getConfiguration(projectPath) {
  // check if file exists, if not throw error
  const configPath = path.join(projectPath, 'polypack_config.yaml')
  if (!fs.existsSync(configPath)) {
    throw new Error(`${chalk.red('❌ ')} Could not find polypack_config.yaml in ${chalk.blue(projectPath)}`)
  }

  const configFile = fs.readFileSync(configPath, 'utf8')
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
  let modulesCount = 0;

  function addToRequires(moduleName, moduleSource) {
    modulesCount++

    try {
      luaparse.parse(moduleSource)
    } catch(err) {
      console.log(chalk.redBright(`❌ Syntax error found in ${moduleName}`))
      console.log(chalk.redBright(`${err}`))

      console.log(chalk.gray(`${moduleName} has been ignored due to syntax error.`))

      return
    }

    importStack += `__requireExports['${moduleName}'] = function()\n`
    importStack += `${moduleSource}\n`
    importStack += `end\n`
  }

  const modulesPath = path.join(projectPath, 'modules/')

  if (fs.existsSync(modulesPath)) {
    const modulesList = getFilesRecursively(modulesPath)
    
    for (let moduleScript of modulesList) {
      const relativePath = path.relative(modulesPath, moduleScript)

      console.log(chalk.gray(`Importing module: ${relativePath}`))

      addToRequires(relativePath, fs.readFileSync(moduleScript, 'utf8'))
    }
  }

  for (let item of Array.from(itemInstances)) {
    if (item.getAttribute('class') == "StringValue") {
      const properties = item.getElementsByTagName('Properties')[0]
      const stringTags = properties.getElementsByTagName('string')

      let classInstanceName = ''

      for (let stringTag of Array.from(stringTags)) {
        if (stringTag.getAttribute('name') == "Name") {
          classInstanceName = stringTag
        }
      }

      if (classInstanceName.textContent == 'ModuleScripts') {
        // loop item
        const moduleScripts = item.getElementsByTagName('Item')

        // Import each scripts
        for (let moduleScript of Array.from(moduleScripts)) {
          const properties = moduleScript.getElementsByTagName('Properties')[0]
          const stringTags = properties.getElementsByTagName('string')

          let moduleName = ''
          let sourceName = ''

          for (let stringTag of Array.from(stringTags)) {
            if (stringTag.getAttribute('name') == "Name") {
              moduleName = stringTag
            }
          }

          for (let stringTag of Array.from(stringTags)) {
            if (stringTag.getAttribute('name') == "Source") {
              sourceName = stringTag
            }
          }

          addToRequires(moduleName.textContent, sourceName.textContent)
        }

        item.parentNode.removeChild(item)

      }
    }
  }

  // Add require definition to place file
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