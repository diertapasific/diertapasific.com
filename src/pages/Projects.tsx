import { ArrowUpRight, GithubLogo } from '@phosphor-icons/react'

import { PROJECTS } from '../data/projects'
export { PROJECTS } from '../data/projects'

export default function Projects() {
  return (
    <div className="px-6 md:px-10 lg:px-14 max-w-4xl mx-auto pb-20">
      <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-[0.18em] mb-5 animate-fade-in">
        Work
      </p>
      <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[0.95] animate-fade-in" style={{ animationDelay: '0.04s' }}>
        Projects
      </h1>
      <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-3 max-w-[52ch] animate-fade-in" style={{ animationDelay: '0.08s' }}>
        AI, software, and mobile — built to solve real problems.
      </p>

      <div className="mt-12 space-y-0">
        {PROJECTS.map((project, i) => (
          <div
            key={project.id}
            className="group border-t border-zinc-200 dark:border-zinc-800/60 py-7 animate-fade-in"
            style={{ animationDelay: `${0.1 + i * 0.04}s` }}
          >
            <div className="flex flex-col md:flex-row md:items-start md:gap-8">
              {/* Number */}
              <span className="text-xs font-mono text-zinc-300 dark:text-zinc-700 mt-1.5 hidden md:block flex-shrink-0 w-6 group-hover:text-blue-500 transition-colors">
                {project.id}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </h2>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5">{project.tagline}</p>
                  </div>
                  {/* Links — desktop */}
                  <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                    {project.links.map(link => {
                      const LinkIcon = link.icon === 'github' ? GithubLogo : ArrowUpRight
                      return (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-blue-500/50 dark:hover:border-blue-500/40 hover:text-blue-700 dark:hover:text-blue-400 transition-all duration-150 active:scale-95"
                        >
                          <LinkIcon size={12} weight="fill" />
                          {link.label}
                        </a>
                      )
                    })}
                  </div>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mt-3 max-w-[62ch]">
                  {project.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Links — mobile */}
                <div className="flex flex-wrap gap-2 mt-4 md:hidden">
                  {project.links.map(link => {
                    const LinkIcon = link.icon === 'github' ? GithubLogo : ArrowUpRight
                    return (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:text-zinc-900 dark:hover:text-zinc-200 transition-all duration-150"
                      >
                        <LinkIcon size={12} weight="fill" />
                        {link.label}
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="border-t border-zinc-200 dark:border-zinc-800/60" />
      </div>
    </div>
  )
}
