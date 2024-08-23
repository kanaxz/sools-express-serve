class Module {
  constructor(options) {
    this.name = options.index.name
    this.options = options
    this.afters = []
  }

  getRoot() {
    return this.options.parent?.getRoot() || this
  }

  getModule(moduleIndex) {
    if (this.options.index === moduleIndex) { return this }
    for (const module of this.modules) {
      const child = module.getModule(moduleIndex)
      if (child) {
        return child
      }
    }
    return null
  }

  loadModules() {
    const { modules } = this.options
    if (!modules) {
      this.modules = []
      return
    }

    this.modules = modules.map((index) => {
      const module = new Module({
        index,
        parent: this,
      })

      module.load()
      return module
    })
  }

  load() {
    this.loadModules()
  }

  async processOptions() {
    const { dependencies, construct } = this.options
    const root = this.getRoot()

    this.dependenciesModules = dependencies.map((dependency) => {
      const module = root.getModule(dependency)
      if (!module) {
        throw new Error(`Module '${dependency.name}' not found from '${this.options.name}'`)
      }
      return module
    })
    for (const dependancy of this.dependenciesModules) {
      await dependancy.process()
    }

    this.dependenciesObjects = this.dependenciesModules.reduce((acc, dependancy) => {
      acc[dependancy.name] = dependancy.object
      return acc
    }, {})
    this.object = await construct(this.dependenciesObjects, root.options.config)
    console.info(`Module ${this.name} processed`)
  }

  async processModules() {
    for (const module of this.modules) {
      await module.process(true)
    }
  }

  async loadAfter() {
    const { after } = this.options
    if (after) {
      const module = this.getRoot().getModule(after)
      if (!module) {
        throw new Error(`Module ${after} not found`)
      }
      module.afters.push(this)
    }
    for (const module of this.modules) {
      module.loadAfter()
    }
  }

  async process(processChilds = false) {
    if (!this.isProcessed) {
      await this.processOptions()
      this.isProcessed = true

      for (const after of this.afters) {
        await after.process()
      }
    }

    if (processChilds) {
      await this.processModules()
    }
  }
}

module.exports = Module
