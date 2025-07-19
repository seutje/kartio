class SimpleTrackEditor {
    constructor(canvas) {
        this.canvas = canvas
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
        this.scene = new THREE.Scene()
        const aspect = canvas.clientWidth / canvas.clientHeight
        const size = 100
        this.camera = new THREE.OrthographicCamera(
            -size * aspect / 2,
            size * aspect / 2,
            size / 2,
            -size / 2,
            0.1,
            1000
        )
        this.camera.position.set(0, 100, 0)
        this.camera.lookAt(0, 0, 0)
        this.scene.add(new THREE.AmbientLight(0xffffff))
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()
        this.track = null
        this.trackData = null
        this.animate = this.animate.bind(this)
        this.animate()
    }

    async loadTrack(name) {
        if (this.track) {
            this.track.obstacles.forEach(o => this.scene.remove(o))
            this.track = null
        }
        this.track = new Track(name, this.scene)
        await this.track.loadTrackData()
        this.trackData = this.track.trackData
        this.camera.zoom = 1
        this.camera.updateProjectionMatrix()
    }

    handleWheel(e) {
        e.preventDefault()
        this.camera.zoom *= e.deltaY < 0 ? 1.1 : 0.9
        this.camera.updateProjectionMatrix()
    }

    handleClick(e, propertyWindow) {
        if (!this.track) return
        const rect = this.canvas.getBoundingClientRect()
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        this.raycaster.setFromCamera(this.mouse, this.camera)
        const hit = this.raycaster.intersectObjects(this.track.obstacles)[0]
        if (hit) {
            this.selected = hit.object
            const idx = this.track.obstacles.indexOf(this.selected)
            propertyWindow.classList.remove('hidden')
            propertyWindow.dataset.index = idx
            const data = this.trackData.obstacles[idx]
            ;['x','y','z','width','height','depth','rotation'].forEach(k => {
                document.getElementById('prop_' + k).value = data[k] || 0
            })
        } else {
            this.selected = null
            propertyWindow.classList.add('hidden')
        }
    }

    applyChanges(propertyWindow) {
        if (!this.selected) return
        const idx = parseInt(propertyWindow.dataset.index)
        const data = this.trackData.obstacles[idx]
        ;['x','y','z','width','height','depth','rotation'].forEach(k => {
            const val = parseFloat(document.getElementById('prop_' + k).value)
            data[k] = val
        })
        const mesh = this.track.obstacles[idx]
        mesh.geometry.dispose()
        mesh.geometry = new THREE.BoxGeometry(data.width, data.height, data.depth)
        mesh.position.set(data.x, data.y, data.z)
        mesh.rotation.y = THREE.MathUtils.degToRad(data.rotation || 0)
        propertyWindow.classList.add('hidden')
    }

    exportJSON() {
        if (!this.trackData) return ''
        return JSON.stringify(this.trackData, null, 2)
    }

    animate() {
        requestAnimationFrame(this.animate)
        this.renderer.render(this.scene, this.camera)
    }
}

const canvas = document.getElementById('editorCanvas')
const trackSelect = document.getElementById('trackSelect')
const importBtn = document.getElementById('importBtn')
const exportBtn = document.getElementById('exportBtn')
const copyBtn = document.getElementById('copyBtn')
const exportArea = document.getElementById('exportArea')
const propertyWindow = document.getElementById('propertyWindow')
const applyBtn = document.getElementById('applyBtn')

const editor = new SimpleTrackEditor(canvas)

canvas.addEventListener('wheel', e => editor.handleWheel(e))
canvas.addEventListener('click', e => editor.handleClick(e, propertyWindow))
applyBtn.addEventListener('click', () => editor.applyChanges(propertyWindow))
importBtn.addEventListener('click', () => editor.loadTrack(trackSelect.value))
exportBtn.addEventListener('click', () => {
    exportArea.value = editor.exportJSON()
})
copyBtn.addEventListener('click', () => {
    exportArea.select()
    document.execCommand('copy')
})
