import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../utils/api'

export default function InterviewPage() {
  const { token } = useParams()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('intro')
  const [candidateName, setCandidateName] = useState('')
  const [warningCount, setWarningCount] = useState(0)
  const [endTime, setEndTime] = useState(null)
  const chatEndRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (step === 'chat') {
      const handleVisibility = () => {
        if (document.hidden) {
          fetch('/api/evaluation/anti-cheat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, event_type: 'switch_tab' }),
          })
          setWarningCount((prev) => {
            const next = prev + 1
            if (next > 5) {
              alert('切屏次数过多，面试已自动结束')
              setStep('ended')
            } else if (next > 3) {
              alert(`警告：您已切屏 ${next} 次，超过5次将自动结束面试`)
            }
            return next
          })
        }
      }
      document.addEventListener('visibilitychange', handleVisibility)
      return () => document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [step, token])

  const handleStart = () => {
    if (!candidateName.trim()) return
    setStep('chat')
    startTimeRef.current = Date.now()
    setEndTime(Date.now() + 30 * 60 * 1000)
    const welcome = { role: 'ai', content: `你好 ${candidateName}，欢迎参加本次面试。请先简单做个自我介绍吧。` }
    setMessages([welcome])
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content,
      }))
      const res = await fetch('/api/interview/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, message: input, history }),
      })

      const data = await res.json()
      if (data.error) {
        setMessages((prev) => [...prev, { role: 'ai', content: 'AI 响应失败：' + JSON.stringify(data.error) }])
      } else {
        setMessages((prev) => [...prev, { role: 'ai', content: data.text || '无响应' }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', content: '网络异常，请重试。' }])
    } finally {
      setLoading(false)
    }
  }

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-white mb-2">AI 面试</h1>
          <p className="text-slate-400 mb-6">请输入您的姓名以开始面试</p>
          <input
            type="text"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none mb-4"
            placeholder="您的姓名"
            autoFocus
          />
          <button
            onClick={handleStart}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            开始面试
          </button>
        </div>
      </div>
    )
  }

  if (step === 'ended') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">面试已结束</h1>
          <p className="text-slate-400">感谢您的参与，评估报告将尽快生成。</p>
        </div>
      </div>
    )
  }

  const timeLeft = endTime ? Math.max(0, Math.floor((endTime - Date.now()) / 60000)) : 0

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="border-b border-slate-700 bg-slate-800/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-medium text-white">AI 面试中</h1>
          {warningCount > 0 && (
            <span className="text-xs text-yellow-400">切屏: {warningCount}/5</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">
            {messages.filter((m) => m.role === 'user').length} 轮问答
          </span>
          <span className="text-xs text-orange-400 font-mono">
            {timeLeft} 分钟
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-slate-700 bg-slate-800/50 p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
            placeholder="输入您的回答..."
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  )
}
