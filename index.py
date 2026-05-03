import json
import os
import sqlite3
import uuid
import datetime
import re
import http.client
from urllib.parse import urlparse

# ---- 数据库初始化 ----
DB_PATH = "/tmp/ai_interview.db"  # veFaaS 只有 /tmp 可写

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS interview_tasks (
            id TEXT PRIMARY KEY,
            job_title TEXT NOT NULL,
            job_description TEXT,
            requirements TEXT,
            duration_minutes INTEGER DEFAULT 30,
            dimensions TEXT,
            ai_style TEXT DEFAULT 'professional',
            status TEXT DEFAULT 'pending',
            participant_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            created_by TEXT
        );
        CREATE TABLE IF NOT EXISTS candidates (
            id TEXT PRIMARY KEY,
            task_id TEXT REFERENCES interview_tasks(id),
            name TEXT NOT NULL,
            contact TEXT,
            education TEXT,
            work_experience TEXT,
            project_experience TEXT,
            skills TEXT,
            resume_file_url TEXT,
            parse_status TEXT DEFAULT 'pending',
            interview_status TEXT DEFAULT 'not_started',
            score INTEGER,
            interview_time TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS evaluation_reports (
            id TEXT PRIMARY KEY,
            candidate_id TEXT REFERENCES candidates(id),
            overall_score INTEGER,
            dimension_scores TEXT,
            strengths TEXT,
            weaknesses TEXT,
            ai_comments TEXT,
            conversation_history TEXT,
            anti_cheat_log TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            description TEXT,
            skills TEXT,
            status TEXT DEFAULT 'active',
            task_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS agent_tasks (
            id TEXT PRIMARY KEY,
            agent_id TEXT REFERENCES agents(id),
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'normal',
            status TEXT DEFAULT 'todo',
            result TEXT,
            assigned_by TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT
        );
    """)
    db.commit()
    db.close()

init_db()

# ---- 初始化项目经理 Agent ----
def ensure_pm_agent():
    db = get_db()
    pm = db.execute("SELECT * FROM agents WHERE role = 'pm'").fetchone()
    if not pm:
        pm_id = "pm-" + str(uuid.uuid4())
        db.execute("INSERT INTO agents (id, name, role, description, skills) VALUES (?, ?, ?, ?, ?)",
                   (pm_id, "项目经理", "pm", "管理项目所有事项，统筹团队Agent，分配任务，创建和维护Agent", "项目管理,任务分配,团队协调,风险管理,进度跟踪"))
        db.commit()
    db.close()

ensure_pm_agent()

# ---- 辅助函数 ----
def success_response(data, status=200):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(data, ensure_ascii=False),
        "isBase64Encoded": False,
    }

def error_response(msg, status=400):
    return success_response({"detail": msg}, status)

def parse_body(event):
    body = event.get("body", "")
    if not body:
        return {}
    try:
        return json.loads(body)
    except:
        return {}

def gen_id():
    return str(uuid.uuid4())

def now_str():
    return datetime.datetime.now().isoformat()

# ---- 火山方舟 AI API ----
def call_ai(messages, model=None):
    api_key = os.environ.get("ARK_API_KEY", "ark-73f1836e-54e9-4b77-9ceb-1fa38ee7c48c-c5d8d")
    base_url = os.environ.get("ARK_BASE_URL", "https://ark.cn-beijing.volces.com")
    model = model or os.environ.get("ARK_MODEL", "doubao-lite-4k")
    
    parsed = urlparse(base_url)
    conn = http.client.HTTPSConnection(parsed.hostname)
    conn.request("POST", f"{parsed.path}/api/v3/chat/completions", json.dumps({
        "model": model,
        "messages": messages,
    }), {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    })
    resp = conn.getresponse()
    data = json.loads(resp.read().decode())
    conn.close()
    
    if "error" in data:
        return None, data["error"]
    return data.get("choices", [{}])[0].get("message", {}).get("content", ""), None

# ---- 路由注册 ----
ROUTES = {}

def route(path, methods=None):
    def decorator(fn):
        key = (path, tuple(methods or ["GET"]))
        ROUTES[key] = fn
        return fn
    return decorator

def match_route(path, method):
    for (route_path, methods), fn in ROUTES.items():
        if method not in methods:
            continue
        pattern = re.sub(r'\{[^}]+\}', r'([^/]+)', route_path)
        pattern = f"^{pattern}$"
        m = re.match(pattern, path)
        if m:
            params = m.groups()
            return fn, params
    return None, None

# ---- API 路由 ----
@route("/api/health", ["GET"])
def health(event, ctx):
    return success_response({"status": "ok"})

@route("/api/tasks", ["GET"])
def list_tasks(event, ctx):
    db = get_db()
    tasks = db.execute("SELECT * FROM interview_tasks ORDER BY created_at DESC").fetchall()
    result = [dict(r) for r in tasks]
    for t in result:
        try:
            t["dimensions"] = json.loads(t["dimensions"]) if t.get("dimensions") else []
        except:
            t["dimensions"] = []
    db.close()
    return success_response(result)

@route("/api/tasks", ["POST"])
def create_task(event, ctx):
    data = parse_body(event)
    if not data.get("job_title"):
        return error_response("岗位名称不能为空", 400)
    
    task_id = gen_id()
    dimensions = json.dumps(data.get("dimensions", []), ensure_ascii=False)
    
    db = get_db()
    db.execute("""
        INSERT INTO interview_tasks (id, job_title, job_description, requirements, duration_minutes, dimensions, ai_style)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (task_id, data["job_title"], data.get("job_description"), data.get("requirements"),
          data.get("duration_minutes", 30), dimensions, data.get("ai_style", "professional")))
    db.commit()
    
    task = db.execute("SELECT * FROM interview_tasks WHERE id = ?", (task_id,)).fetchone()
    result = dict(task)
    try:
        result["dimensions"] = json.loads(result["dimensions"])
    except:
        result["dimensions"] = []
    db.close()
    return success_response(result, 201)

@route("/api/tasks/{id}", ["GET"])
def get_task(event, ctx, task_id=None):
    db = get_db()
    task = db.execute("SELECT * FROM interview_tasks WHERE id = ?", (task_id,)).fetchone()
    db.close()
    if not task:
        return error_response("Task not found", 404)
    result = dict(task)
    try:
        result["dimensions"] = json.loads(result["dimensions"])
    except:
        result["dimensions"] = []
    return success_response(result)

@route("/api/tasks/{id}", ["DELETE"])
def delete_task(event, ctx, task_id=None):
    db = get_db()
    task = db.execute("SELECT * FROM interview_tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        db.close()
        return error_response("Task not found", 404)
    db.execute("DELETE FROM interview_tasks WHERE id = ?", (task_id,))
    db.commit()
    db.close()
    return success_response({"message": "Task deleted"})

@route("/api/candidates", ["POST"])
def create_candidate(event, ctx):
    data = parse_body(event)
    if not data.get("name") or not data.get("task_id"):
        return error_response("姓名和任务ID不能为空", 400)
    
    candidate_id = gen_id()
    skills = json.dumps(data.get("skills", []), ensure_ascii=False)
    
    db = get_db()
    db.execute("""
        INSERT INTO candidates (id, task_id, name, contact, education, work_experience, project_experience, skills)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (candidate_id, data["task_id"], data["name"], data.get("contact"),
          data.get("education"), data.get("work_experience"), data.get("project_experience"), skills))
    db.commit()
    
    candidate = db.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
    result = dict(candidate)
    db.close()
    return success_response(result, 201)

@route("/api/candidates/task/{task_id}", ["GET"])
def list_candidates(event, ctx, task_id=None):
    db = get_db()
    candidates = db.execute("SELECT * FROM candidates WHERE task_id = ?", (task_id,)).fetchall()
    result = [dict(c) for c in candidates]
    db.close()
    return success_response(result)

@route("/api/candidates/{id}", ["GET"])
def get_candidate(event, ctx, candidate_id=None):
    db = get_db()
    candidate = db.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
    db.close()
    if not candidate:
        return error_response("Candidate not found", 404)
    return success_response(dict(candidate))

@route("/api/interview/stream", ["POST"])
def interview_stream(event, ctx):
    data = parse_body(event)
    message = data.get("message", "")
    history = data.get("history", [])
    token = data.get("token", "")
    
    db = get_db()
    task = db.execute("SELECT * FROM interview_tasks WHERE id = ?", (token,)).fetchone()
    context = ""
    if task:
        context = f"岗位：{task['job_title']}\n"
        if task['job_description']:
            context += f"职责：{task['job_description']}\n"
        if task['requirements']:
            context += f"要求：{task['requirements']}\n"
        if task['dimensions']:
            try:
                dims = json.loads(task['dimensions'])
                context += f"考察维度：{', '.join(dims)}\n"
            except:
                pass
    db.close()
    
    system_prompt = f"""你是一位专业的AI面试官。根据岗位要求进行结构化面试。
每次只提一个问题，简洁明了。根据候选人回答进行追问。

{context}""".strip() if context else """你是一位专业的AI面试官。每次只提一个问题，简洁明了。"""
    
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-12:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": message})
    
    content, err = call_ai(messages)
    if err:
        return success_response({"error": err}, 500)
    
    return success_response({"text": content})

@route("/api/evaluation/generate", ["POST"])
def generate_report(event, ctx):
    params = event.get("queryStringParameters") or {}
    candidate_id = params.get("candidate_id", "")
    
    db = get_db()
    candidate = db.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
    if not candidate:
        db.close()
        return error_response("Candidate not found", 404)
    
    existing = db.execute("SELECT * FROM evaluation_reports WHERE candidate_id = ?", (candidate_id,)).fetchone()
    if existing:
        result = dict(existing)
        try:
            result["dimension_scores"] = json.loads(result["dimension_scores"])
            result["conversation_history"] = json.loads(result["conversation_history"])
            result["anti_cheat_log"] = json.loads(result["anti_cheat_log"]) if result["anti_cheat_log"] else []
        except:
            pass
        db.close()
        return success_response(result)
    
    conversation = existing.get("conversation_history", "[]") if existing else "[]"
    
    report_prompt = f"""根据面试对话生成评估报告，返回JSON：
{{
  "overall_score": 85,
  "dimension_scores": {{"技术能力": 80, "沟通能力": 90}},
  "strengths": "优势...",
  "weaknesses": "待改进...",
  "ai_comments": "综合评价..."
}}
面试对话：{conversation}"""
    
    messages = [{"role": "user", "content": report_prompt}]
    content, err = call_ai(messages)
    if err:
        db.close()
        return success_response({"error": err}, 500)
    
    try:
        report_data = json.loads(content)
    except:
        db.close()
        return error_response("报告生成失败", 500)
    
    report_id = gen_id()
    db.execute("""
        INSERT INTO evaluation_reports (id, candidate_id, overall_score, dimension_scores, strengths, weaknesses, ai_comments, conversation_history)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (report_id, candidate_id, report_data.get("overall_score"),
          json.dumps(report_data.get("dimension_scores", {})),
          report_data.get("strengths"), report_data.get("weaknesses"),
          report_data.get("ai_comments"), conversation))
    
    db.execute("UPDATE candidates SET interview_status = 'completed', score = ? WHERE id = ?",
               (report_data.get("overall_score"), candidate_id))
    db.commit()
    
    db.close()
    return success_response({**report_data, "id": report_id, "candidate_id": candidate_id})

@route("/api/evaluation/anti-cheat", ["POST"])
def log_anti_cheat(event, ctx):
    data = parse_body(event)
    token = data.get("token", "")
    event_type = data.get("event_type", "")
    
    db = get_db()
    candidate = db.execute("SELECT * FROM candidates WHERE id = ?", (token,)).fetchone()
    db.close()
    if not candidate:
        return success_response({"message": "ignored"})
    
    log_entry = {"event": event_type, "time": now_str()}
    return success_response({"message": "logged"})

# ---- Agent 管理路由 ----
@route("/api/agents", ["GET"])
def list_agents(event, ctx):
    db = get_db()
    agents = db.execute("SELECT * FROM agents ORDER BY created_at DESC").fetchall()
    result = [dict(a) for a in agents]
    db.close()
    return success_response(result)

@route("/api/agents", ["POST"])
def create_agent(event, ctx):
    data = parse_body(event)
    if not data.get("name") or not data.get("role"):
        return error_response("名称和角色不能为空", 400)

    agent_id = gen_id()
    db = get_db()
    db.execute("""
        INSERT INTO agents (id, name, role, description, skills) VALUES (?, ?, ?, ?, ?)
    """, (agent_id, data["name"], data["role"], data.get("description"),
          data.get("skills", "")))
    db.commit()

    agent = db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone()
    result = dict(agent)
    db.close()
    return success_response(result, 201)

@route("/api/agents/{id}", ["GET"])
def get_agent(event, ctx, agent_id=None):
    db = get_db()
    agent = db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone()
    db.close()
    if not agent:
        return error_response("Agent not found", 404)
    return success_response(dict(agent))

@route("/api/agents/{id}", ["PUT"])
def update_agent(event, ctx, agent_id=None):
    data = parse_body(event)
    db = get_db()
    agent = db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone()
    if not agent:
        db.close()
        return error_response("Agent not found", 404)

    fields = []
    values = []
    for key in ["name", "role", "description", "skills", "status"]:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    if not fields:
        db.close()
        return error_response("No fields to update", 400)

    values.append(agent_id)
    db.execute(f"UPDATE agents SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()

    updated = db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone()
    result = dict(updated)
    db.close()
    return success_response(result)

@route("/api/agents/{id}", ["DELETE"])
def delete_agent(event, ctx, agent_id=None):
    db = get_db()
    agent = db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone()
    if not agent:
        db.close()
        return error_response("Agent not found", 404)
    db.execute("DELETE FROM agent_tasks WHERE agent_id = ?", (agent_id,))
    db.execute("DELETE FROM agents WHERE id = ?", (agent_id,))
    db.commit()
    db.close()
    return success_response({"message": "Agent deleted"})

# ---- Agent 任务管理路由 ----
@route("/api/agent-tasks", ["GET"])
def list_agent_tasks(event, ctx):
    params = event.get("queryStringParameters") or {}
    agent_id = params.get("agent_id", "")

    db = get_db()
    if agent_id:
        tasks = db.execute("""
            SELECT t.*, a.name as agent_name FROM agent_tasks t
            JOIN agents a ON t.agent_id = a.id
            WHERE t.agent_id = ? ORDER BY t.created_at DESC
        """, (agent_id,)).fetchall()
    else:
        tasks = db.execute("""
            SELECT t.*, a.name as agent_name FROM agent_tasks t
            JOIN agents a ON t.agent_id = a.id
            ORDER BY t.created_at DESC
        """).fetchall()
    result = [dict(t) for t in tasks]
    db.close()
    return success_response(result)

@route("/api/agent-tasks", ["POST"])
def create_agent_task(event, ctx):
    data = parse_body(event)
    if not data.get("title") or not data.get("agent_id"):
        return error_response("任务标题和Agent ID不能为空", 400)

    task_id = gen_id()
    db = get_db()
    db.execute("""
        INSERT INTO agent_tasks (id, agent_id, title, description, priority, assigned_by)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (task_id, data["agent_id"], data["title"], data.get("description"),
          data.get("priority", "normal"), data.get("assigned_by", "")))

    db.execute("UPDATE agents SET task_count = task_count + 1 WHERE id = ?", (data["agent_id"],))
    db.commit()

    task = db.execute("SELECT * FROM agent_tasks WHERE id = ?", (task_id,)).fetchone()
    result = dict(task)
    db.close()
    return success_response(result, 201)

@route("/api/agent-tasks/{id}", ["PUT"])
def update_agent_task(event, ctx, task_id=None):
    data = parse_body(event)
    db = get_db()
    task = db.execute("SELECT * FROM agent_tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        db.close()
        return error_response("Task not found", 404)

    fields = []
    values = []
    for key in ["title", "description", "priority", "status", "result"]:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    if "status" in data and data["status"] == "done":
        fields.append("completed_at = ?")
        values.append(now_str())
    if not fields:
        db.close()
        return error_response("No fields to update", 400)

    values.append(task_id)
    db.execute(f"UPDATE agent_tasks SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()

    updated = db.execute("SELECT * FROM agent_tasks WHERE id = ?", (task_id,)).fetchone()
    result = dict(updated)
    db.close()
    return success_response(result)

@route("/api/agent-tasks/{id}", ["DELETE"])
def delete_agent_task(event, ctx, task_id=None):
    db = get_db()
    task = db.execute("SELECT * FROM agent_tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        db.close()
        return error_response("Task not found", 404)
    db.execute("UPDATE agents SET task_count = MAX(0, task_count - 1) WHERE id = ?", (task["agent_id"],))
    db.execute("DELETE FROM agent_tasks WHERE id = ?", (task_id,))
    db.commit()
    db.close()
    return success_response({"message": "Task deleted"})

# ---- 项目经理 AI 调度 ----
@route("/api/pm/smart-assign", ["POST"])
def pm_smart_assign(event, ctx):
    data = parse_body(event)
    title = data.get("title", "")
    description = data.get("description", "")

    if not title:
        return error_response("任务标题不能为空", 400)

    db = get_db()
    agents = db.execute("SELECT id, name, role, skills FROM agents WHERE status = 'active'").fetchall()
    agents_list = [{"id": a["id"], "name": a["name"], "role": a["role"], "skills": a["skills"]} for a in agents]
    db.close()

    if not agents_list:
        return error_response("没有活跃的Agent", 400)

    pm_prompt = f"""你是项目经理，请分析任务并选择最适合的Agent。只返回JSON。
候选Agent：{json.dumps(agents_list, ensure_ascii=False)}
任务标题：{title}
任务描述：{description}

返回格式：{{"agent_id": "选中的AgentID", "reason": "选择理由", "suggestion": "执行建议"}}"""

    messages = [{"role": "user", "content": pm_prompt}]
    content, err = call_ai(messages)
    if err:
        return success_response({"error": err}, 500)

    try:
        result = json.loads(content)
    except:
        result = {"agent_id": agents_list[0]["id"], "reason": "AI分析失败，已默认分配", "suggestion": ""}

    agent_id = result.get("agent_id", agents_list[0]["id"])
    task_id = gen_id()

    db = get_db()
    db.execute("""
        INSERT INTO agent_tasks (id, agent_id, title, description, priority, assigned_by)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (task_id, agent_id, title, description, "normal", "项目经理"))
    db.execute("UPDATE agents SET task_count = task_count + 1 WHERE id = ?", (agent_id,))
    db.commit()
    db.close()

    return success_response({"task_id": task_id, "agent_id": agent_id, "reason": result.get("reason", ""), "suggestion": result.get("suggestion", "")})

# ---- veFaaS 入口 ----
def handler(event, context):
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("path") or event.get("requestContext", {}).get("http", {}).get("path", "/")
    
    # 处理 OPTIONS 预检请求
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
            "isBase64Encoded": False,
        }
    
    fn, params = match_route(path, method)
    if not fn:
        return error_response("Not found", 404)
    
    try:
        return fn(event, context, *params)
    except Exception as e:
        return error_response(str(e), 500)
