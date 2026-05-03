import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const taskStatusColors = {
  todo: 'bg-gray-600 text-gray-200',
  doing: 'bg-yellow-600 text-yellow-100',
  done: 'bg-green-600 text-green-100',
}

const priorityColors = {
  high: 'bg-red-600 text-red-100',
  normal: 'bg-blue-600 text-blue-100',
  low: 'bg-gray-500 text-gray-100',
}

const agentRoleLabels = {
  pm: '项目经理',
  dev: '开发工程师',
  test: '测试工程师',
  design: '设计师',
  ops: '运维工程师',
  data: '数据分析师',
  other: '其他',
}

export default function Agents() {
  const [agents, setAgents] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('agents')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [pmResult, setPmResult] = useState(null)

  const [agentForm, setAgentForm] = useState({
    name: '',
    role: 'dev',
    description: '',
    skills: '',
  })

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'normal',
    useAiAssign: true,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [agentsRes, tasksRes] = await Promise.all([
        api.get('/api/agents'),
        api.get('/api/agent-tasks'),
      ])
      const agentsData = await agentsRes.json()
      const tasksData = await tasksRes.json()
      setAgents(agentsData)
      setTasks(tasksData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAgent = async () => {
    if (!agentForm.name.trim()) {
      alert('请输入Agent名称')
      return
    }
    const res = await api.post('/api/agents', agentForm)
    if (res.ok) {
      setShowCreateModal(false)
      setAgentForm({ name: '', role: 'dev', description: '', skills: '' })
      fetchData()
    } else {
      const err = await res.json()
      alert('创建失败：' + JSON.stringify(err))
    }
  }

  const handleDeleteAgent = async (id) => {
    if (!confirm('确认删除该Agent？所有关联任务也将一并删除。')) return
    await api.delete(`/api/agents/${id}`)
    fetchData()
  }

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) {
      alert('请输入任务标题')
      return
    }

    if (taskForm.useAiAssign) {
      const res = await api.post('/api/pm/smart-assign', {
        title: taskForm.title,
        description: taskForm.description,
      })
      const data = await res.json()
      if (res.ok) {
        setPmResult(data)
        setShowTaskModal(false)
        setTaskForm({ title: '', description: '', priority: 'normal', useAiAssign: true })
        fetchData()
      } else {
        alert('AI分配失败：' + JSON.stringify(data))
      }
    } else {
      if (!selectedAgent) {
        alert('请选择一个Agent')
        return
      }
      const res = await api.post('/api/agent-tasks', {
        agent_id: selectedAgent.id,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        assigned_by: '手动分配',
      })
      if (res.ok) {
        setShowTaskModal(false)
        setTaskForm({ title: '', description: '', priority: 'normal', useAiAssign: true })
        fetchData()
      }
    }
  }

  const handleUpdateTaskStatus = async (taskId, status) => {
    await api.put(`/api/agent-tasks/${taskId}`, { status })
    fetchData()
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('确认删除该任务？')) return
    await api.delete(`/api/agent-tasks/${taskId}`)
    fetchData()
  }

  const stats = {
    total: agents.length,
    active: agents.filter((a) => a.status === 'active').length,
    totalTasks: tasks.length,
    doneTasks: tasks.filter((t) => t.status === 'done').length,
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Agent 团队管理</h1>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowTaskModal(true); setPmResult(null) }}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              + 分配任务
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              + 创建 Agent
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Agent 总数" value={stats.total} color="text-blue-400" />
          <StatCard label="活跃 Agent" value={stats.active} color="text-emerald-400" />
          <StatCard label="任务总数" value={stats.totalTasks} color="text-yellow-400" />
          <StatCard label="已完成任务" value={stats.doneTasks} color="text-green-400" />
        </div>

        {pmResult && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🤖</span>
              <span className="text-sm font-medium text-white">项目经理 AI 已分配任务</span>
              <button onClick={() => setPmResult(null)} className="ml-auto text-xs text-slate-500 hover:text-slate-300">关闭</button>
            </div>
            <p className="text-sm text-slate-400 mb-1">选择理由：{pmResult.reason}</p>
            {pmResult.suggestion && (
              <p className="text-sm text-slate-400">执行建议：{pmResult.suggestion}</p>
            )}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <TabBtn active={activeTab === 'agents'} onClick={() => setActiveTab('agents')}>Agent 列表</TabBtn>
          <TabBtn active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>任务列表</TabBtn>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">加载中...</div>
        ) : activeTab === 'agents' ? (
          <AgentList
            agents={agents}
            tasks={tasks}
            onDelete={handleDeleteAgent}
            onAssignTask={(agent) => { setSelectedAgent(agent); setShowTaskModal(true); setTaskForm({ ...taskForm, useAiAssign: false }); setPmResult(null) }}
          />
        ) : (
          <TaskList
            tasks={tasks}
            onUpdateStatus={handleUpdateTaskStatus}
            onDelete={handleDeleteTask}
          />
        )}
      </div>

      {showCreateModal && (
        <Modal title="创建 Agent" onClose={() => setShowCreateModal(false)}>
          <div className="space-y-4">
            <Field label="名称 *" value={agentForm.name} onChange={(v) => setAgentForm({ ...agentForm, name: v })} placeholder="如：前端开发Agent" />
            <div>
              <label className="block text-sm text-slate-400 mb-1">角色 *</label>
              <select
                value={agentForm.role}
                onChange={(e) => setAgentForm({ ...agentForm, role: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(agentRoleLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">描述</label>
              <textarea
                value={agentForm.description}
                onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
                rows={2}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none resize-none"
                placeholder="描述Agent的职责和定位"
              />
            </div>
            <Field label="技能标签" value={agentForm.skills} onChange={(v) => setAgentForm({ ...agentForm, skills: v })} placeholder="用逗号分隔，如：React, TypeScript, CSS" />
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-slate-400 border border-slate-600 rounded-lg hover:border-slate-500">取消</button>
              <button onClick={handleCreateAgent} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500">创建</button>
            </div>
          </div>
        </Modal>
      )}

      {showTaskModal && (
        <Modal title={taskForm.useAiAssign ? "AI 智能分配任务" : `分配任务给 ${selectedAgent?.name || ''}`} onClose={() => setShowTaskModal(false)}>
          <div className="space-y-4">
            <Field label="任务标题 *" value={taskForm.title} onChange={(v) => setTaskForm({ ...taskForm, title: v })} placeholder="如：完成用户信息模块开发" />
            <div>
              <label className="block text-sm text-slate-400 mb-1">任务描述</label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={3}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none resize-none"
                placeholder="详细描述任务内容和预期成果"
              />
            </div>
            {!taskForm.useAiAssign && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">优先级</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="high">高优先级</option>
                  <option value="normal">普通</option>
                  <option value="low">低优先级</option>
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={taskForm.useAiAssign}
                onChange={(e) => setTaskForm({ ...taskForm, useAiAssign: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-300">由项目经理 AI 智能分配</span>
            </label>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-sm text-slate-400 border border-slate-600 rounded-lg hover:border-slate-500">取消</button>
              <button onClick={handleCreateTask} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500">提交</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg transition-colors ${active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
    >
      {children}
    </button>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
        placeholder={placeholder}
      />
    </div>
  )
}

function AgentList({ agents, tasks, onDelete, onAssignTask }) {
  const getTaskCount = (agentId) => tasks.filter((t) => t.agent_id === agentId).length
  const getDoneCount = (agentId) => tasks.filter((t) => t.agent_id === agentId && t.status === 'done').length

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => {
        const total = getTaskCount(agent.id)
        const done = getDoneCount(agent.id)
        return (
          <div key={agent.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {agent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">{agent.name}</h3>
                  <p className="text-xs text-slate-500">{agentRoleLabels[agent.role] || agent.role}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${agent.status === 'active' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-600/20 text-slate-400'}`}>
                {agent.status === 'active' ? '活跃' : '休眠'}
              </span>
            </div>
            {agent.description && (
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">{agent.description}</p>
            )}
            {agent.skills && (
              <div className="flex flex-wrap gap-1 mb-3">
                {agent.skills.split(',').map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{s.trim()}</span>
                ))}
              </div>
            )}
            <div className="flex gap-3 text-xs text-slate-500 mb-3">
              <span>总任务：{total}</span>
              <span>已完成：{done}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onAssignTask(agent)}
                className="flex-1 py-1.5 text-xs bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
              >
                分配任务
              </button>
              <button
                onClick={() => onDelete(agent.id)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        )
      })}
      {agents.length === 0 && (
        <div className="col-span-full text-center py-12 text-slate-500">暂无 Agent，请点击右上角创建</div>
      )}
    </div>
  )
}

function TaskList({ tasks, onUpdateStatus, onDelete }) {
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority] || priorityColors.normal}`}>
                {task.priority === 'high' ? '高' : task.priority === 'low' ? '低' : '普通'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${taskStatusColors[task.status] || taskStatusColors.todo}`}>
                {task.status === 'todo' ? '待处理' : task.status === 'doing' ? '进行中' : '已完成'}
              </span>
              <span className="text-xs text-slate-500">{task.agent_name || '未分配'}</span>
              {task.assigned_by && (
                <span className="text-xs text-slate-600">分配者：{task.assigned_by}</span>
              )}
            </div>
            <h4 className="text-sm text-white truncate">{task.title}</h4>
            {task.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {task.status !== 'done' && (
              <button
                onClick={() => onUpdateStatus(task.id, task.status === 'todo' ? 'doing' : 'done')}
                className="px-3 py-1.5 text-xs bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors"
              >
                {task.status === 'todo' ? '开始' : '完成'}
              </button>
            )}
            <button
              onClick={() => onDelete(task.id)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      ))}
      {tasks.length === 0 && (
        <div className="text-center py-12 text-slate-500">暂无任务</div>
      )}
    </div>
  )
}
