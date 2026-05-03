function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-400">
      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Hero */}
        <section className="mb-20">
          <p className="text-sm tracking-widest uppercase text-zinc-500 mb-4">
            Product Manager
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
            Alex Chen
          </h1>
          <p className="text-lg leading-relaxed max-w-2xl text-zinc-400">
            8年经验的产品经理，专注于B端SaaS和AI产品。擅长从0到1搭建产品体系，主导过多个百万级用户产品的规划与落地。
          </p>
        </section>

        {/* Projects */}
        <section className="mb-20">
          <h2 className="text-xl font-medium text-white mb-8">过往项目</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: '智能客服系统',
                desc: '为某电商平台打造AI客服系统，接入大模型实现智能问答，人工客服介入率降低40%。',
                link: '#',
              },
              {
                title: '供应链管理平台',
                desc: '从0到1搭建供应链SaaS平台，整合采购、仓储、物流模块，服务200+企业客户。',
                link: '#',
              },
              {
                title: '数据分析看板',
                desc: '设计可视化数据分析工具，支持多维度自定义报表，日均PV 50万+。',
                link: '#',
              },
              {
                title: '移动端增长项目',
                desc: '主导APP用户增长策略，通过A/B测试和漏斗优化，3个月内DAU提升65%。',
                link: '#',
              },
            ].map((project) => (
              <a
                key={project.title}
                href={project.link}
                className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900"
              >
                <h3 className="text-base font-medium text-white mb-2 group-hover:text-zinc-200">
                  {project.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {project.desc}
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="mb-20">
          <h2 className="text-xl font-medium text-white mb-6">技能</h2>
          <div className="flex flex-wrap gap-2">
            {[
              '产品规划',
              '需求分析',
              '用户调研',
              '数据分析',
              'A/B测试',
              '原型设计',
              'Axure',
              'Figma',
              'SQL',
              '敏捷开发',
              'AI产品',
              'SaaS',
              'B端产品',
              '项目管理',
            ].map((skill) => (
              <span
                key={skill}
                className="px-3 py-1.5 text-sm rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-400"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-medium text-white mb-6">联系方式</h2>
          <div className="flex flex-col gap-3 text-sm">
            <a
              href="mailto:alex@example.com"
              className="text-zinc-500 hover:text-white transition-colors"
            >
              alex@example.com
            </a>
            <a
              href="https://linkedin.com/in/alexchen"
              className="text-zinc-500 hover:text-white transition-colors"
            >
              LinkedIn
            </a>
            <span className="text-zinc-500">上海 · 中国</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
