import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const statusColors = {
  pending: 'bg-gray-600 text-gray-200',
  ongoing: 'bg-green-600 text-green-100',
  completed: 'bg-blue-600 text-blue-100',
}

const statusLabels = {
  pending: '待开始',
  ongoing: '进行中',
  completed: '已完成',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await api.get('/api/tasks')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setTasks(data)
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确认删除该面试任务？')) return
    await api.delete(`/api/tasks/${id}`)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const handleCopyLink = (taskId) => {
    const link = `${window.location.origin}/interview/${taskId}`
    navigator.clipboard.writeText(link)
    alert('面试链接已复制到剪贴板')
  }

  const stats = {
    total: tasks.length,
    ongoing: tasks.filter((t) => t.status === 'ongoing').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    totalParticipants: tasks.reduce((sum, t) => sum + (t.participant_count || 0), 0),
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-white">AI 面试管理系统</h1>
            <button
              onClick={() => navigate('/agents')}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Agent团队
            </button>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors"
          >
            新建面试
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '面试总场次', value: stats.total },
            { label: '进行中', value: stats.ongoing },
            { label: '已完成', value: stats.completed },
            { label: '参与人数', value: stats.totalParticipants },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700"
            >
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className="text-2xl font-semibold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-medium text-white mb-4">面试任务列表</h2>
        {loading ? (
          <p className="text-slate-500">加载中...</p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="mb-4">暂无面试任务</p>
            <button
              onClick={() => navigate('/create')}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              创建第一个面试任务 →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-medium text-white">
                      {task.job_title}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[task.status]}`}>
                      {statusLabels[task.status]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {new Date(task.created_at).toLocaleString('zh-CN')} · {task.participant_count} 人参与
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/detail/${task.id}`)}
                    className="px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                  >
                    详情
                  </button>
                  <button
                    onClick={() => handleCopyLink(task.id)}
                    className="px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 border border-blue-800 rounded-lg hover:border-blue-700 transition-colors"
                  >
                    复制链接
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-800 rounded-lg hover:border-red-700 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
