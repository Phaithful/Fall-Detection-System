/**
 * Canvas drawing utilities for pose skeleton overlay.
 */

// MediaPipe pose landmark connections (index pairs)
const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31],
  [24, 26], [26, 28], [28, 30], [30, 32],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
]

// Landmark index → name mapping (33 MediaPipe landmarks)
const LANDMARK_ORDER = [
  'nose','left_eye_inner','left_eye','left_eye_outer',
  'right_eye_inner','right_eye','right_eye_outer',
  'left_ear','right_ear','mouth_left','mouth_right',
  'left_shoulder','right_shoulder','left_elbow','right_elbow',
  'left_wrist','right_wrist','left_pinky','right_pinky',
  'left_index','right_index','left_thumb','right_thumb',
  'left_hip','right_hip','left_knee','right_knee',
  'left_ankle','right_ankle','left_heel','right_heel',
  'left_foot_index','right_foot_index',
]

/**
 * Draw pose skeleton on a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} keypoints - map of landmark_name → [x, y, z, visibility]
 * @param {number} width  - canvas pixel width
 * @param {number} height - canvas pixel height
 * @param {boolean} isFall - use red colour scheme if true
 */
export function drawSkeleton(ctx, keypoints, width, height, isFall = false) {
  if (!keypoints || !ctx) return

  const lineColor  = isFall ? 'rgba(239,68,68,0.9)'   : 'rgba(59,130,246,0.9)'
  const dotColor   = isFall ? 'rgba(239,68,68,1)'     : 'rgba(16,185,129,1)'
  const glowColor  = isFall ? 'rgba(239,68,68,0.3)'   : 'rgba(59,130,246,0.2)'

  // Build index → pixel point map
  const pts = {}
  LANDMARK_ORDER.forEach((name, idx) => {
    const kp = keypoints[name]
    if (kp && kp[3] > 0.3) {
      pts[idx] = { x: kp[0] * width, y: kp[1] * height }
    }
  })

  ctx.save()

  // Draw connections
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.shadowColor = glowColor
  ctx.shadowBlur = 6

  CONNECTIONS.forEach(([a, b]) => {
    if (pts[a] && pts[b]) {
      ctx.beginPath()
      ctx.moveTo(pts[a].x, pts[a].y)
      ctx.lineTo(pts[b].x, pts[b].y)
      ctx.stroke()
    }
  })

  // Draw keypoint dots
  ctx.shadowBlur = 10
  ctx.fillStyle = dotColor

  Object.values(pts).forEach(({ x, y }) => {
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.restore()
}

/**
 * Draw a semi-transparent overlay flash (for fall alert).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} alpha - 0–1 opacity
 */
export function drawFallFlash(ctx, width, height, alpha = 0.25) {
  ctx.save()
  ctx.fillStyle = `rgba(239,68,68,${alpha})`
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

/**
 * Clear the canvas completely.
 */
export function clearCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height)
}

/**
 * Capture a frame from a video element as a base64 JPEG string.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} scratchCanvas
 * @returns {string} base64 JPEG data URL
 */
export function captureVideoFrame(video, scratchCanvas) {
  const w = video.videoWidth  || 640
  const h = video.videoHeight || 480
  scratchCanvas.width  = w
  scratchCanvas.height = h
  const ctx = scratchCanvas.getContext('2d')
  ctx.drawImage(video, 0, 0, w, h)
  return scratchCanvas.toDataURL('image/jpeg', 0.7)
}
