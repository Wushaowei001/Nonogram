import Nonogram from './Nonogram'
import $ from './colors'

const eekwall = (arr1, arr2) => arr1.toString() === arr2.toString()

export default class Game extends Nonogram {
  constructor(row, column, canvas, {
    theme,
    onSuccess = () => { },
    onAnimationEnd = () => { },
  } = {}) {
    super()
    this.theme.filledColor = $.blue
    this.theme.emptyColor = $.red
    this.theme.wrongColor = $.grey
    this.theme.isMeshed = true
    Object.assign(this.theme, theme)

    this.handleSuccess = onSuccess
    this.handleAnimationEnd = onAnimationEnd

    this.hints = {
      row: row.slice(),
      column: column.slice(),
    }
    this.removeNonPositiveHints()
    this.m = this.hints.row.length
    this.n = this.hints.column.length
    this.grid = new Array(this.m)
    for (let i = 0; i < this.m; i += 1) {
      this.grid[i] = new Array(this.n).fill(Game.UNSET)
    }
    this.hints.row.forEach((r, i) => { r.isCorrect = this.isLineCorrect('row', i) })
    this.hints.column.forEach((c, j) => { c.isCorrect = this.isLineCorrect('column', j) })

    this.initCanvas(canvas)

    this.brush = Game.FILLED
    this.draw = {}
    this.print()
  }

  initListeners() {
    this.listeners = [
      ['mousedown', this.mousedown.bind(this)],
      ['mousemove', this.mousemove.bind(this)],
      ['mouseup', this.brushUp.bind(this)],
      ['mouseleave', this.brushUp.bind(this)],
    ]
  }
  mousedown(e) {
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const d = rect.width * 2 / 3 / (this.n + 1)
    const location = this.getLocation(x, y)
    if (location === 'controller') {
      this.switchBrush()
    } else if (location === 'grid') {
      this.draw.firstI = Math.floor(y / d - 0.5)
      this.draw.firstJ = Math.floor(x / d - 0.5)
      this.draw.inverted = e.button === 2
      const cell = this.grid[this.draw.firstI][this.draw.firstJ]
      let brush = this.brush
      if (this.draw.inverted) {
        brush = this.brush === Game.FILLED ? Game.EMPTY : Game.FILLED
      }
      if (cell === Game.UNSET || brush === cell) {
        this.draw.mode = (brush === cell) ? 'empty' : 'filling'
        this.isPressed = true
        this.switchCell(this.draw.firstI, this.draw.firstJ)
      }
      this.draw.lastI = this.draw.firstI
      this.draw.lastJ = this.draw.firstJ
    }
  }
  mousemove(e) {
    if (this.isPressed) {
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const d = rect.width * 2 / 3 / (this.n + 1)
      if (this.getLocation(x, y) === 'grid') {
        const i = Math.floor(y / d - 0.5)
        const j = Math.floor(x / d - 0.5)
        if (i !== this.draw.lastI || j !== this.draw.lastJ) {
          if (this.draw.direction === undefined) {
            if (i === this.draw.firstI) {
              this.draw.direction = 'row'
            } else if (j === this.draw.firstJ) {
              this.draw.direction = 'column'
            }
          }
          if ((this.draw.direction === 'row' && i === this.draw.firstI) ||
            (this.draw.direction === 'column' && j === this.draw.firstJ)) {
            this.switchCell(i, j)
            this.draw.lastI = i
            this.draw.lastJ = j
          }
        }
      }
    }
  }
  switchBrush() {
    this.brush = (this.brush === Game.EMPTY) ? Game.FILLED : Game.EMPTY
    this.printController()
  }
  brushUp() {
    delete this.isPressed
    this.draw = {}
  }
  switchCell(i, j) {
    let brush = this.brush
    if (this.draw.inverted) {
      brush = this.brush === Game.FILLED ? Game.EMPTY : Game.FILLED
    }
    if (brush === Game.FILLED && this.grid[i][j] !== Game.EMPTY) {
      this.grid[i][j] = (this.draw.mode === 'filling') ? Game.FILLED : Game.UNSET
      this.hints.row[i].isCorrect = eekwall(this.calculateHints('row', i), this.hints.row[i])
      this.hints.column[j].isCorrect = eekwall(this.calculateHints('column', j), this.hints.column[j])
      this.print()
      const correct = this.hints.row.every(singleRow => singleRow.isCorrect) &&
        this.hints.column.every(singleCol => singleCol.isCorrect)
      if (correct) {
        this.succeed()
      }
    } else if (brush === Game.EMPTY && this.grid[i][j] !== Game.FILLED) {
      this.grid[i][j] = (this.draw.mode === 'filling') ? Game.EMPTY : Game.UNSET
      this.print()
    }
  }

  printCell(status) {
    const ctx = this.canvas.getContext('2d')
    const d = this.canvas.width * 2 / 3 / (this.n + 1)
    switch (status) {
      case Game.FILLED:
        ctx.fillStyle = this.theme.filledColor
        ctx.fillRect(-d * 0.05, -d * 0.05, d * 1.1, d * 1.1)
        break
      case Game.EMPTY:
        ctx.strokeStyle = this.theme.emptyColor
        ctx.lineWidth = d / 15
        ctx.beginPath()
        ctx.moveTo(d * 0.3, d * 0.3)
        ctx.lineTo(d * 0.7, d * 0.7)
        ctx.moveTo(d * 0.3, d * 0.7)
        ctx.lineTo(d * 0.7, d * 0.3)
        ctx.stroke()
        break
      default:
        return
    }
  }
  printController() {
    const ctx = this.canvas.getContext('2d')
    const w = this.canvas.width
    const h = this.canvas.height
    const controllerSize = Math.min(w, h) / 4
    const outerSize = controllerSize * 3 / 4
    const offset = controllerSize / 4
    const borderWidth = controllerSize / 20
    const innerSize = outerSize - 2 * borderWidth

    function printFillingBrush() {
      ctx.save()
      ctx.translate(offset, 0)
      ctx.fillStyle = this.theme.meshColor
      ctx.fillRect(0, 0, outerSize, outerSize)
      ctx.fillStyle = this.theme.filledColor
      ctx.fillRect(borderWidth, borderWidth, innerSize, innerSize)
      ctx.restore()
    }

    function printEmptyBrush() {
      ctx.save()
      ctx.translate(0, offset)
      ctx.fillStyle = this.theme.meshColor
      ctx.fillRect(0, 0, outerSize, outerSize)
      ctx.clearRect(borderWidth, borderWidth, innerSize, innerSize)
      ctx.strokeStyle = $.red
      ctx.lineWidth = borderWidth
      ctx.beginPath()
      ctx.moveTo(outerSize * 0.3, outerSize * 0.3)
      ctx.lineTo(outerSize * 0.7, outerSize * 0.7)
      ctx.moveTo(outerSize * 0.3, outerSize * 0.7)
      ctx.lineTo(outerSize * 0.7, outerSize * 0.3)
      ctx.stroke()
      ctx.restore()
    }

    ctx.clearRect(w * 2 / 3 - 1, h * 2 / 3 - 1, w / 3 + 1, h / 3 + 1)
    ctx.save()
    ctx.translate(w * 0.7, h * 0.7)
    if (this.brush === Game.FILLED) {
      printEmptyBrush.call(this)
      printFillingBrush.call(this)
    } else if (this.brush === Game.EMPTY) {
      printFillingBrush.call(this)
      printEmptyBrush.call(this)
    }
    ctx.restore()
  }

  succeed() {
    this.handleSuccess()
    this.listeners.forEach(([type, listener]) => {
      this.canvas.removeEventListener(type, listener)
    })
    const ctx = this.canvas.getContext('2d')
    const w = this.canvas.width
    const h = this.canvas.height
    const controllerSize = Math.min(w, h) / 4
    const background = ctx.getImageData(0, 0, w, h)

    function getTick() {
      const size = controllerSize * 2
      const borderWidth = size / 10
      const tick = document.createElement('canvas')
      tick.width = size
      tick.height = size

      const c = tick.getContext('2d')
      c.translate(size / 3, size * 5 / 6)
      c.rotate(-Math.PI / 4)
      c.fillStyle = $.green
      c.fillRect(0, 0, borderWidth, -size * Math.SQRT2 / 3)
      c.fillRect(0, 0, size * Math.SQRT2 * 2 / 3, -borderWidth)

      return tick
    }

    const tick = getTick()
    let t = 0

    function f(_) {
      return 1 + Math.pow(_ - 1, 3)
    }

    function fadeTickIn() {
      ctx.putImageData(background, 0, 0)
      t += 0.03
      ctx.globalAlpha = f(t)
      ctx.clearRect(w * 2 / 3, h * 2 / 3, w / 3, h / 3)
      ctx.drawImage(tick,
        w * 0.7 - (1 - f(t)) * controllerSize / 2,
        h * 0.7 - (1 - f(t)) * controllerSize / 2,
        (2 - f(t)) * controllerSize,
        (2 - f(t)) * controllerSize)
      if (t <= 1) {
        requestAnimationFrame(fadeTickIn.bind(this))
      } else {
        this.handleAnimationEnd()
      }
    }

    fadeTickIn.call(this)
  }
}
