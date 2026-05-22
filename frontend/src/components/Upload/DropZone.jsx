import React, { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { UploadCloud, Film, AlertCircle } from 'lucide-react'

const ALLOWED = ['.mp4', '.avi', '.mov', '.mkv', '.webm']

export default function DropZone({ onFile, disabled = false }) {
  const [dragging, setDragging] = useState(false)
  const [error,    setError]    = useState(null)

  const validate = (file) => {
    if (!file) return 'No file selected'
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ALLOWED.includes(ext)) return `Unsupported format. Allowed: ${ALLOWED.join(', ')}`
    if (file.size > 500 * 1024 * 1024) return 'File exceeds 500 MB limit'
    return null
  }

  const handle = useCallback((file) => {
    setError(null)
    const err = validate(file)
    if (err) { setError(err); return }
    onFile(file)
  }, [onFile])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    if (disabled) return
    handle(e.dataTransfer.files[0])
  }, [disabled, handle])

  return (
    <div>
      <label
        className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl
          px-8 py-10 cursor-pointer transition-all duration-150
          ${disabled     ? 'opacity-50 pointer-events-none border-slate-200 bg-slate-50' :
            dragging     ? 'border-blue-400 bg-blue-50'                                   :
            error        ? 'border-red-300 bg-red-50'                                     :
            'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'}`}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input type="file" accept={ALLOWED.join(',')} className="sr-only"
               onChange={e => handle(e.target.files[0])} disabled={disabled}
               aria-label="Video file upload" />

        <motion.div animate={{ scale: dragging ? 1.08 : 1 }} transition={{ duration: 0.15 }}>
          {dragging
            ? <Film size={36} className="text-blue-500" strokeWidth={1.5} />
            : <UploadCloud size={36} className="text-slate-300" strokeWidth={1.5} />
          }
        </motion.div>

        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            {dragging ? 'Drop your video here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {ALLOWED.join(', ')} · Max 500 MB
          </p>
        </div>
      </label>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg"
        >
          <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </motion.div>
      )}
    </div>
  )
}
