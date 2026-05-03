import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

export default function CreateInterview() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    job_title: '',
    job_description: '',
    requirements: '',
    duration_minutes: 30,
    dimensions: '',
    ai_style: 'professional',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.job_title.trim()) {
      alert('请输入岗位名称')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/api/tasks', {
        ...form,
        dimensions: form.dimensions
          ? form.dimensions.split(',').map((d) => d.trim()).filter(Boolean)
          : ['技术能力', '沟通能力', '学习能力'],
      })
      if (res.ok) {
        navigate('/')
      } else {
        const err = await res.json()
        alert('创建失败：' + JSON.stringify(err))
      }
    } catch (err) {
      alert('创建失败：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white mr-4"
          >
            ← 返回
          </button>
          <h1 className="text-xl font-semibold text-white">新建面试任务</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-base font-medium text-white mb-4">基础信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  岗位名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.job_title}
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="如：前端开发工程师"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">岗位职责</label>
                <textarea
                  value={form.job_description}
                  onChange={(e) => setForm({ ...form, job_description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="描述岗位的主要职责..."
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">任职要求</label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="描述岗位的任职要求..."
                />
              </div>
            </div>
          </section>

          <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-base font-medium text-white mb-4">面试配置</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">面试时长（分钟）</label>
                <input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
                  min={10}
                  max={120}
                  className="w-32 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">考察维度</label>
                <input
                  type="text"
                  value={form.dimensions}
                  onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="用逗号分隔，如：技术能力, 沟通能力, 学习能力"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">AI 面试官风格</label>
                <select
                  value={form.ai_style}
                  onChange={(e) => setForm({ ...form, ai_style: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="professional">专业严肃</option>
                  <option value="friendly">亲和友善</option>
                  <option value="pressure">压力面试</option>
                </select>
              </div>
            </div>
          </section>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2 text-sm text-slate-400 border border-slate-600 rounded-lg hover:border-slate-500 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {loading ? '创建中...' : '保存并创建'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
