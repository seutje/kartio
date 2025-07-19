class TrackEditor {
    constructor() {
        this.canvas = document.getElementById('editorCanvas')
        this.ctx = this.canvas.getContext('2d')
        this.scale = 2
        this.trackData = null
        this.obstacles = []
        this.selectedObstacle = null
        this.addEventListeners()
        this.resizeCanvas()
    }

    async loadTrack(type) {
        try {
            const response = await fetch(`src/tracks/${type}.json`)
            this.trackData = await response.json()
            this.obstacles = this.trackData.obstacles || []
            this.draw()
        } catch (err) {
            console.error('Failed to load track', err)
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight - document.getElementById('toolbar').offsetHeight - document.getElementById('exportArea').offsetHeight
        this.draw()
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas())
        this.canvas.addEventListener('wheel', e => {
            e.preventDefault()
            const delta = e.deltaY < 0 ? 1.1 : 0.9
            this.scale *= delta
            this.draw()
        })
        this.canvas.addEventListener('click', e => this.handleClick(e))
        document.getElementById('applyBtn').addEventListener('click', () => this.applyProperties())
        document.getElementById('closeEdit').addEventListener('click', () => document.getElementById('editOverlay').classList.add('hidden'))
        document.getElementById('exportBtn').addEventListener('click', () => this.exportJson())
        document.getElementById('copyBtn').addEventListener('click', () => {
            const area = document.getElementById('exportArea')
            area.select()
            document.execCommand('copy')
        })
    }

    draw() {
        const ctx = this.ctx
        const canvas = this.canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (!this.trackData) return

        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.scale(this.scale, -this.scale)

        const geo = this.trackData.trackGeometry
        ctx.fillStyle = '#' + parseInt(this.trackData.trackGeometry.roadColor).toString(16)
        ctx.fillRect(-geo.width / 2, -geo.height / 2, geo.width, geo.height)
        ctx.strokeStyle = '#' + parseInt(this.trackData.trackGeometry.borderColor).toString(16)
        ctx.lineWidth = 1 / this.scale
        ctx.strokeRect(-geo.width / 2, -geo.height / 2, geo.width, geo.height)

        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        this.obstacles.forEach(ob => {
            ctx.save()
            ctx.translate(ob.x, ob.z)
            const rad = (ob.rotation || 0) * Math.PI / 180
            ctx.rotate(rad)
            ctx.fillRect(-ob.width / 2, -ob.depth / 2, ob.width, ob.depth)
            ctx.restore()
        })
        ctx.restore()
    }

    handleClick(e) {
        if (!this.trackData) return
        const rect = this.canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left - this.canvas.width / 2) / this.scale
        const z = -(e.clientY - rect.top - this.canvas.height / 2) / this.scale
        for (const ob of this.obstacles) {
            if (this.pointInObstacle(x, z, ob)) {
                this.selectedObstacle = ob
                this.openEditWindow(ob)
                return
            }
        }
    }

    pointInObstacle(x, z, ob) {
        const rad = (ob.rotation || 0) * Math.PI / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const dx = x - ob.x
        const dz = z - ob.z
        const localX = dx * cos + dz * sin
        const localZ = -dx * sin + dz * cos
        return Math.abs(localX) <= ob.width / 2 && Math.abs(localZ) <= ob.depth / 2
    }

    openEditWindow(ob) {
        const overlay = document.getElementById('editOverlay')
        overlay.classList.remove('hidden')
        overlay.querySelector('#propType').value = ob.type
        overlay.querySelector('#propX').value = ob.x
        overlay.querySelector('#propY').value = ob.y
        overlay.querySelector('#propZ').value = ob.z
        overlay.querySelector('#propWidth').value = ob.width
        overlay.querySelector('#propHeight').value = ob.height
        overlay.querySelector('#propDepth').value = ob.depth
        overlay.querySelector('#propRotation').value = ob.rotation || 0
    }

    applyProperties() {
        if (!this.selectedObstacle) return
        const overlay = document.getElementById('editOverlay')
        this.selectedObstacle.type = overlay.querySelector('#propType').value
        this.selectedObstacle.x = parseFloat(overlay.querySelector('#propX').value)
        this.selectedObstacle.y = parseFloat(overlay.querySelector('#propY').value)
        this.selectedObstacle.z = parseFloat(overlay.querySelector('#propZ').value)
        this.selectedObstacle.width = parseFloat(overlay.querySelector('#propWidth').value)
        this.selectedObstacle.height = parseFloat(overlay.querySelector('#propHeight').value)
        this.selectedObstacle.depth = parseFloat(overlay.querySelector('#propDepth').value)
        this.selectedObstacle.rotation = parseFloat(overlay.querySelector('#propRotation').value)
        overlay.classList.add('hidden')
        this.draw()
    }

    exportJson() {
        const area = document.getElementById('exportArea')
        if (this.trackData) {
            area.value = JSON.stringify(this.trackData, null, 2)
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = { TrackEditor }
}
