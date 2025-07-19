const canvas = document.getElementById('editorCanvas')
const ctx = canvas.getContext('2d')
const trackSelect = document.getElementById('trackSelect')
const importBtn = document.getElementById('importBtn')
const exportBtn = document.getElementById('exportBtn')
const copyBtn = document.getElementById('copyBtn')
const exportArea = document.getElementById('exportArea')
const propertyWindow = document.getElementById('propertyWindow')
const applyBtn = document.getElementById('applyBtn')

let trackData = null
let scale = 5
let selectedObstacle = null

function worldToCanvas(x, z) {
    return {
        x: canvas.width / 2 + x * scale,
        y: canvas.height / 2 + z * scale
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!trackData) return
    ctx.fillStyle = '#444'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#888'
    trackData.obstacles.forEach(obs => {
        const pos = worldToCanvas(obs.x, obs.z)
        const w = obs.width * scale
        const h = obs.depth * scale
        ctx.save()
        ctx.translate(pos.x, pos.y)
        ctx.rotate((obs.rotation || 0) * Math.PI / 180)
        ctx.fillStyle = 'red'
        ctx.fillRect(-w / 2, -h / 2, w, h)
        ctx.restore()
    })
}

function getClickedObstacle(mx, my) {
    if (!trackData) return null
    for (let i = trackData.obstacles.length - 1; i >= 0; i--) {
        const obs = trackData.obstacles[i]
        const pos = worldToCanvas(obs.x, obs.z)
        const w = obs.width * scale
        const h = obs.depth * scale
        const angle = (obs.rotation || 0) * Math.PI / 180
        const dx = mx - pos.x
        const dy = my - pos.y
        const tx = Math.cos(-angle) * dx - Math.sin(-angle) * dy
        const ty = Math.sin(-angle) * dx + Math.cos(-angle) * dy
        if (Math.abs(tx) <= w / 2 && Math.abs(ty) <= h / 2) {
            return { obs, index: i }
        }
    }
    return null
}

canvas.addEventListener('wheel', e => {
    e.preventDefault()
    scale *= e.deltaY < 0 ? 1.1 : 0.9
    draw()
})

canvas.addEventListener('click', e => {
    if (!trackData) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const result = getClickedObstacle(mx, my)
    if (result) {
        selectedObstacle = result
        propertyWindow.classList.remove('hidden')
        propertyWindow.dataset.index = result.index
        ;['x','y','z','width','height','depth','rotation'].forEach(key => {
            const input = document.getElementById('prop_' + key)
            input.value = result.obs[key] || 0
        })
    } else {
        propertyWindow.classList.add('hidden')
    }
})

applyBtn.addEventListener('click', () => {
    if (!selectedObstacle) return
    const obs = trackData.obstacles[selectedObstacle.index]
    ;['x','y','z','width','height','depth','rotation'].forEach(key => {
        const input = document.getElementById('prop_' + key)
        obs[key] = parseFloat(input.value)
    })
    propertyWindow.classList.add('hidden')
    draw()
})

importBtn.addEventListener('click', async () => {
    const track = trackSelect.value
    const res = await fetch(`src/tracks/${track}.json`)
    trackData = await res.json()
    draw()
})

exportBtn.addEventListener('click', () => {
    if (!trackData) return
    exportArea.value = JSON.stringify(trackData, null, 2)
})

copyBtn.addEventListener('click', () => {
    exportArea.select()
    document.execCommand('copy')
})

draw()
